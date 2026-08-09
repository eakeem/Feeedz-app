import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { apiRequest, supabase } from './src/api/client';
import { demoEvents, EventItem } from './src/data/events';
import { colors, genreColor, genres, parishes } from './src/theme';

// White silhouette icons using text symbols
const icons = {
  feed: '●',
  events: '■',
  favorites: '▲',
  profile: '◆',
  search: '○',
  heart: '♥',
  heartOutline: '♡',
  back: '←',
  add: '+',
  remove: '×',
  calendar: '□',
  time: '◷',
  location: '◎',
  ticket: '▣',
  directions: '→',
  taxi: '▤',
  camera: '◉',
  upload: '↑',
  live: '●'
};

type Screen = 'home' | 'events' | 'favorites' | 'search' | 'details' | 'promoter' | 'promoter-auth' | 'create' | 'manage' | 'profile';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 10;
const GRID_COL_WIDTH = (SCREEN_WIDTH - 40 - GRID_GAP) / 2;

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [events, setEvents] = useState(demoEvents);
  const [selectedEvent, setSelectedEvent] = useState<EventItem>(demoEvents[0]);
  const [query, setQuery] = useState('');
  const [parish, setParish] = useState('');
  const [genre, setGenre] = useState('');
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [promoterEmail, setPromoterEmail] = useState('');
  const [promoterOtp, setPromoterOtp] = useState('');
  const [promoterName, setPromoterName] = useState('');
  const [promoterEvents, setPromoterEvents] = useState<EventItem[]>(demoEvents.slice(0, 2));
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userParish, setUserParish] = useState('Kingston');
  const [locationLoading, setLocationLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    detectLocation();
    const t = setTimeout(() => setShowSplash(false), 2800);
    return () => clearTimeout(t);
  }, []);

  async function detectLocation() {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUserParish('Kingston');
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync({ latitude: location.coords.latitude, longitude: location.coords.longitude });

      if (place?.region) {
        // Remove "Parish" suffix: "Saint Ann Parish" -> "Saint Ann"
        const parishName = place.region.replace(/\s+Parish$/i, '');
        setUserParish(parishName);
      } else if (place?.city) {
        setUserParish(place.city);
      } else {
        setUserParish('Kingston');
      }
    } catch {
      setUserParish('Kingston');
    } finally {
      setLocationLoading(false);
    }
  }

  function getEventsByParish(parishName: string) {
    return events.filter((event) => event.parish === parishName);
  }

  const parishEvents = useMemo(() => getEventsByParish(userParish), [events, userParish]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    const text = `${event.title} ${event.venue} ${event.parish} ${event.genre}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (!parish || event.parish === parish) && (!genre || event.genre === genre);
  }), [events, genre, parish, query]);

  const favoriteEvents = useMemo(() => events.filter((event) => favorites.has(event.id)), [events, favorites]);

  function openEvent(event: EventItem) {
    setSelectedEvent(event);
    setScreen('details');
  }

  function toggleFavorite(eventId: string) {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(eventId)) {
        next.delete(eventId);
        setEvents((evts) => evts.map((e) => e.id === eventId ? { ...e, likeCount: e.likeCount - 1 } : e));
      } else {
        next.add(eventId);
        setEvents((evts) => evts.map((e) => e.id === eventId ? { ...e, likeCount: e.likeCount + 1 } : e));
      }
      return next;
    });
  }

  async function uploadLivePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
    if (result.canceled) return;

    const compressed = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 1200 } }], {
      compress: 0.68,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true
    });

    try {
      await apiRequest(`/events/${selectedEvent.id}/live-photos`, {
        method: 'POST',
        body: JSON.stringify({ imageBase64: `data:image/jpeg;base64,${compressed.base64}` })
      });
    } catch {
      // Local fallback keeps the prototype usable before the Railway API is running.
    }

    setEvents((currentEvents) => currentEvents.map((event) => event.id === selectedEvent.id
      ? { ...event, livePhotos: [compressed.uri, ...event.livePhotos].slice(0, 200) }
      : event));
    setSelectedEvent((event) => ({ ...event, livePhotos: [compressed.uri, ...event.livePhotos].slice(0, 200) }));
  }

  async function buyTickets() {
    if (selectedEvent.ticketUrl) {
      await Linking.openURL(selectedEvent.ticketUrl);
      return;
    }
    setTicketModalVisible(true);
  }

  async function openDirections() {
    const queryText = encodeURIComponent(`${selectedEvent.address}, ${selectedEvent.parish}, Jamaica`);
    const url = Platform.OS === 'ios' ? `http://maps.apple.com/?q=${queryText}` : `https://www.google.com/maps/search/?api=1&query=${queryText}`;
    await Linking.openURL(url);
  }

  async function sendPromoterOtp() {
    if (!promoterEmail) {
      Alert.alert('Missing email', 'Enter your promoter email first.');
      return;
    }
    try {
      await supabase.auth.signInWithOtp({ email: promoterEmail });
      Alert.alert('OTP sent', 'Check your email for the sign-in code.');
    } catch {
      Alert.alert('OTP queued', 'Supabase is not configured yet, so the demo flow will continue locally.');
    }
  }

  async function verifyPromoterOtp() {
    if (!promoterEmail || !promoterOtp) {
      Alert.alert('Missing details', 'Enter your email and OTP code.');
      return;
    }
    try {
      await supabase.auth.verifyOtp({ email: promoterEmail, token: promoterOtp, type: 'email' });
    } catch {
      // Keep local demo path available until Supabase project keys are configured.
    }
    setScreen('manage');
  }

  function submitTicketInterest(payload: { name: string; email: string; phone: string }) {
    setTicketModalVisible(false);
    void apiRequest(`/events/${selectedEvent.id}/ticket-interest`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }).catch(() => undefined);
    Alert.alert('Request received', 'Your ticket request has been saved. Direct PDF ticket delivery is coming next.');
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        {showSplash && <SplashScreen />}
        <View style={styles.shell}>
          {screen === 'home' && <HomeScreen events={parishEvents} userParish={userParish} locationLoading={locationLoading} favorites={favorites} onToggleFavorite={toggleFavorite} onOpen={openEvent} />}
          {screen === 'events' && <EventsScreen events={filteredEvents} query={query} setQuery={setQuery} genre={genre} setGenre={setGenre} parish={parish} setParish={setParish} favorites={favorites} onToggleFavorite={toggleFavorite} onOpen={openEvent} />}
          {screen === 'favorites' && <FavoritesScreen events={favoriteEvents} favorites={favorites} onToggleFavorite={toggleFavorite} onOpen={openEvent} />}
          {screen === 'details' && <DetailsScreen event={selectedEvent} isFavorite={favorites.has(selectedEvent.id)} onToggleFavorite={() => toggleFavorite(selectedEvent.id)} onBack={() => setScreen('events')} onBuyTickets={buyTickets} onDirections={openDirections} onUploadPhoto={uploadLivePhoto} />}
          {screen === 'promoter' && <PromoterScreen onCreate={() => setScreen('create')} onManage={() => setScreen('manage')} onAuth={() => setScreen('promoter-auth')} />}
          {screen === 'promoter-auth' && <PromoterAuthScreen email={promoterEmail} name={promoterName} otp={promoterOtp} setEmail={setPromoterEmail} setName={setPromoterName} setOtp={setPromoterOtp} onSendOtp={sendPromoterOtp} onVerify={verifyPromoterOtp} />}
          {screen === 'create' && <CreateEventScreen onPublished={(event) => { setEvents((currentEvents) => [event, ...currentEvents]); setPromoterEvents((currentEvents) => [event, ...currentEvents]); setScreen('manage'); }} />}
          {screen === 'manage' && <ManageEventsScreen events={promoterEvents} onCreate={() => setScreen('create')} onOpen={openEvent} />}
          {screen === 'profile' && <ProfileScreen onPromoter={() => setScreen('promoter')} />}
        </View>
        <TicketInterestModal visible={ticketModalVisible} onClose={() => setTicketModalVisible(false)} onSubmit={submitTicketInterest} />
        <View style={styles.nav}>
          <NavButton active={screen === 'home'} label="Feed" iconName="home" onPress={() => setScreen('home')} />
          <NavButton active={screen === 'events'} label="Events" iconName="calendar" onPress={() => setScreen('events')} />
          <NavButton active={screen === 'favorites'} label="Favorites" iconName="heart" onPress={() => setScreen('favorites')} />
          <NavButton active={screen === 'profile'} label="Profile" iconName="person" onPress={() => setScreen('profile')} />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

/* ============ SPLASH SCREEN ============ */
function SplashScreen() {
  const letters = ['f', 'e', 'e', 'e', 'd', 'z'];
  const isAccent = [false, true, true, true, false, false];
  const letterAnims = useRef(letters.map(() => new Animated.Value(0))).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Staggered letter fade-up (matches index1.html .anim-up delays)
    Animated.stagger(100, letterAnims.map((a) =>
      Animated.timing(a, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    )).start();

    // Tagline fade-up after letters (delay-2 = 200ms)
    Animated.timing(taglineAnim, { toValue: 1, duration: 500, delay: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

    // Bouncing dots — loop: 0%,100% scale 1 opacity .3 → 50% scale 1.4 opacity 1
    dotAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(anim, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={styles.splashContainer}>
      {/* feeedz logo with letter-by-letter fade-up */}
      <View style={styles.splashLogoRow}>
        {letters.map((letter, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.splashLetter,
              isAccent[i] && styles.splashLetterAccent,
              {
                opacity: letterAnims[i],
                transform: [{ translateY: letterAnims[i].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
              },
            ]}
          >
            {letter}
          </Animated.Text>
        ))}
      </View>

      {/* tagline */}
      <Animated.Text
        style={[
          styles.splashTagline,
          { opacity: taglineAnim, transform: [{ translateY: taglineAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
        ]}
      >
        Discover Jamaica's Hottest Events
      </Animated.Text>

      {/* bouncing dots */}
      <View style={styles.splashDots}>
        {dotAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.splashDot,
              {
                opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

/* ============ HOME / FEED ============ */
function HomeScreen({ events, userParish, locationLoading, favorites, onToggleFavorite, onOpen }: { events: EventItem[]; userParish: string; locationLoading: boolean; favorites: Set<string>; onToggleFavorite: (id: string) => void; onOpen: (event: EventItem) => void }) {
  const liveEvents = events.filter((event) => event.livePhotos.length > 0);
  const trendingEvents = [...events].sort((a, b) => b.likeCount - a.likeCount);
  const weekendEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    const day = eventDate.getDay();
    return day === 0 || day === 6; // Saturday or Sunday
  });

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View>
      <Text style={styles.kicker}>What's good,</Text>
      {locationLoading ? (
        <Text style={styles.logo}>Detecting...</Text>
      ) : (
        <Text style={styles.logo}>{userParish}</Text>
      )}
    </View>

    {liveEvents.length > 0 && (
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.liveIcon}>●</Text> Live Now
          </Text>
          <Text style={styles.seeAll}>See All</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
          {liveEvents.map((event) => <EventCardV key={event.id} event={event} onPress={() => onOpen(event)} />)}
        </ScrollView>
      </View>
    )}

    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>This Weekend</Text>
        <Text style={styles.seeAll}>See All</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
        {weekendEvents.length > 0 ? weekendEvents.map((event) => <EventCardV key={event.id} event={event} onPress={() => onOpen(event)} />) : events.slice(0, 3).map((event) => <EventCardV key={event.id} event={event} onPress={() => onOpen(event)} />)}
      </ScrollView>
    </View>

    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>
          <Text style={styles.trendingIcon}>▲</Text> Trending
        </Text>
      </View>
      {trendingEvents.map((event, index) => <EventCardH key={event.id} event={event} index={index} isFavorite={favorites.has(event.id)} onToggleFavorite={() => onToggleFavorite(event.id)} onPress={() => onOpen(event)} />)}
    </View>
  </ScrollView>;
}

/* ============ EVENTS TAB (Pinterest grid) ============ */
function EventsScreen(props: {
  events: EventItem[];
  query: string;
  genre: string;
  parish: string;
  setQuery: (v: string) => void;
  setGenre: (v: string) => void;
  setParish: (v: string) => void;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  onOpen: (event: EventItem) => void;
}) {
  const leftColumn: EventItem[] = [];
  const rightColumn: EventItem[] = [];
  props.events.forEach((event, index) => {
    (index % 2 === 0 ? leftColumn : rightColumn).push(event);
  });
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Text style={styles.heading}>Events</Text>
    <View style={styles.searchBar}>
      <Text style={styles.searchIcon}>○</Text>
      <TextInput style={styles.searchInput} placeholder="Search events, venues, parishes..." placeholderTextColor={colors.dim} value={props.query} onChangeText={props.setQuery} />
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
      {genres.map((item) => <Chip key={item.name} label={item.name} active={props.genre === item.name} tint={item.color} onPress={() => props.setGenre(props.genre === item.name ? '' : item.name)} />)}
    </ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
      {parishes.map((item) => <Chip key={item} label={item} active={props.parish === item} onPress={() => props.setParish(props.parish === item ? '' : item)} />)}
    </ScrollView>
    <Text style={styles.meta}>{props.events.length} events found</Text>
    <View style={styles.pinterestGrid}>
      <View style={styles.pinterestColumn}>
        {leftColumn.map((event) => <PosterCard key={event.id} event={event} isFavorite={props.favorites.has(event.id)} onToggleFavorite={() => props.onToggleFavorite(event.id)} onPress={() => props.onOpen(event)} />)}
      </View>
      <View style={styles.pinterestColumn}>
        {rightColumn.map((event) => <PosterCard key={event.id} event={event} isFavorite={props.favorites.has(event.id)} onToggleFavorite={() => props.onToggleFavorite(event.id)} onPress={() => props.onOpen(event)} />)}
      </View>
    </View>
  </ScrollView>;
}

function PosterCard({ event, isFavorite, onToggleFavorite, onPress }: { event: EventItem; isFavorite: boolean; onToggleFavorite: () => void; onPress: () => void }) {
  const poster = event.posters[0] ?? event.coverUrl;
  const heights = [220, 280, 250, 300];
  const height = heights[event.id.length % heights.length];
  const isLivePoster = event.livePhotos.length > 0;
  return <Pressable style={styles.posterCard} onPress={onPress}>
    <Image source={poster} style={[styles.posterImage, { height }]} contentFit="cover" />
    <View style={styles.posterOverlay}>
      <View style={[styles.posterGenreBadge, { backgroundColor: `${genreColor(event.genre)}22`, borderColor: genreColor(event.genre) }]}>
        <Text style={[styles.posterGenreText, { color: genreColor(event.genre) }]}>{event.genre}</Text>
      </View>
      {isLivePoster && <View style={styles.eventCardHLiveBadge}><Text style={styles.eventCardHLiveText}>LIVE</Text></View>}
      <Pressable style={styles.heartButton} onPress={(e) => { e.stopPropagation(); onToggleFavorite(); }} hitSlop={8}>
        <Text style={styles.heartIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
        <Text style={styles.heartCount}>{event.likeCount}</Text>
      </Pressable>
    </View>
    <View style={styles.posterBody}>
      <Text style={styles.posterTitle} numberOfLines={2}>{event.title}</Text>
      <Text style={styles.posterMeta}>{event.date} • {event.venue}</Text>
      <Text style={[styles.posterPrice, { color: genreColor(event.genre) }]}>{event.priceJmd === 0 ? 'FREE' : `$${event.priceJmd.toLocaleString()} JMD`}</Text>
    </View>
  </Pressable>;
}

/* ============ EVENT CARD VERTICAL (for horizontal scroll) ============ */
function EventCardV({ event, onPress }: { event: EventItem; onPress: () => void }) {
  const isLive = event.livePhotos.length > 0;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
      ).start();
    }
  }, [isLive]);

  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return <Pressable style={styles.eventCardV} onPress={onPress}>
    <Image source={event.coverUrl} style={styles.eventCardVImage} contentFit="cover" />
    <View style={styles.eventCardVOverlay} />
    <View style={[styles.eventCardVGenreBadge, { backgroundColor: `${genreColor(event.genre)}22`, borderColor: genreColor(event.genre) }]}>
      <Text style={[styles.eventCardVGenreText, { color: genreColor(event.genre) }]}>{event.genre}</Text>
    </View>
    {isLive && (
      <Animated.View style={[styles.eventCardVLiveBadge, { transform: [{ scale: pulseScale }] }]}>
        <Text style={styles.eventCardVLiveText}>LIVE</Text>
        <Animated.View style={[styles.eventCardVLivePulse, { opacity: pulseOpacity, transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }] }]} />
      </Animated.View>
    )}
    <View style={styles.eventCardVPriceBadge}>
      <Text style={styles.eventCardVPriceText}>{event.priceJmd === 0 ? 'FREE' : `$${event.priceJmd.toLocaleString()}`}</Text>
    </View>
    <View style={styles.eventCardVBody}>
      <Text style={styles.eventCardVTitle}>{event.title}</Text>
      <Text style={styles.eventCardVMeta}>{event.date} • {event.startTime}</Text>
      <Text style={styles.eventCardVMeta}>{event.venue}, {event.parish}</Text>
    </View>
  </Pressable>;
}

/* ============ EVENT CARD HORIZONTAL (for list) ============ */
function EventCardH({ event, index, isFavorite, onToggleFavorite, onPress }: { event: EventItem; index: number; isFavorite: boolean; onToggleFavorite: () => void; onPress: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 60, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  return <Animated.View style={[styles.eventCardH, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
    <Pressable style={styles.eventCardHInner} onPress={onPress}>
      <Image source={event.coverUrl} style={styles.eventCardHImage} contentFit="cover" />
      <View style={styles.eventCardHInfo}>
        <View style={styles.eventCardHHeader}>
          <View style={[styles.eventCardHGenreBadge, { backgroundColor: `${genreColor(event.genre)}22`, borderColor: genreColor(event.genre) }]}>
            <Text style={[styles.eventCardHGenreText, { color: genreColor(event.genre) }]}>{event.genre}</Text>
          </View>
          {event.livePhotos.length > 0 && <View style={styles.eventCardHLiveBadge}><Text style={styles.eventCardHLiveText}>LIVE</Text></View>}
        </View>
        <Text style={styles.eventCardHTitle}>{event.title}</Text>
        <Text style={styles.eventCardHMeta}>{event.date} • {event.startTime}</Text>
        <Text style={styles.eventCardHMeta}>{event.venue}, {event.parish}</Text>
        <Text style={[styles.eventCardHPrice, { color: genreColor(event.genre) }]}>{event.priceJmd === 0 ? 'FREE' : `$${event.priceJmd.toLocaleString()} JMD`}</Text>
        <Pressable style={styles.feedHeartRow} onPress={(e) => { e.stopPropagation(); onToggleFavorite(); }} hitSlop={8}>
          <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={16} color={isFavorite ? colors.magenta : colors.muted} />
          <Text style={[styles.feedHeartCount, isFavorite && { color: colors.magenta }]}>{event.likeCount}</Text>
        </Pressable>
      </View>
    </Pressable>
  </Animated.View>;
}

/* ============ FAVORITES ============ */
function FavoritesScreen({ events, favorites, onToggleFavorite, onOpen }: { events: EventItem[]; favorites: Set<string>; onToggleFavorite: (id: string) => void; onOpen: (event: EventItem) => void }) {
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Text style={styles.heading}>Favorites</Text>
    <Text style={styles.meta}>{events.length} saved event{events.length !== 1 ? 's' : ''}</Text>
    {events.length === 0 && <View style={styles.emptyState}><Text style={styles.emptyIcon}>❤️</Text><Text style={styles.emptyText}>No favorites yet. Tap the heart on any event poster to save it here.</Text></View>}
    {events.map((event) => <EventRow key={event.id} event={event} onPress={() => onOpen(event)} />)}
  </ScrollView>;
}

/* ============ EVENT DETAILS (with poster carousel) ============ */
function DetailsScreen({ event, isFavorite, onToggleFavorite, onBack, onBuyTickets, onDirections, onUploadPhoto }: { event: EventItem; isFavorite: boolean; onToggleFavorite: () => void; onBack: () => void; onBuyTickets: () => void; onDirections: () => void; onUploadPhoto: () => void }) {
  const [activePoster, setActivePoster] = useState(0);
  const carouselRef = useRef<ScrollView>(null);
  const posters = event.posters.length > 0 ? event.posters : [event.coverUrl];

  return <ScrollView showsVerticalScrollIndicator={false}>
    <View style={styles.carouselContainer}>
      <ScrollView
        ref={carouselRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setActivePoster(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
      >
        {posters.map((poster, index) => <Image key={index} source={poster} style={styles.carouselImage} contentFit="cover" />)}
      </ScrollView>
      <Pressable style={styles.carouselBack} onPress={onBack}><Text style={styles.carouselBackText}>←</Text></Pressable>
      <Pressable style={styles.carouselHeart} onPress={onToggleFavorite} hitSlop={8}>
        <Text style={styles.carouselHeartIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
      </Pressable>
      {posters.length > 1 && <View style={styles.carouselDots}>
        {posters.map((_, index) => <View key={index} style={[styles.carouselDot, index === activePoster && styles.carouselDotActive]} />)}
      </View>}
    </View>

    <View style={styles.content}>
      <Text style={[styles.badge, { color: genreColor(event.genre) }]}>{event.genre}</Text>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.meta}>{event.date} at {event.startTime} • {event.venue}, {event.parish}</Text>
      <View style={styles.likeRow}>
        <Text style={styles.likeCountText}>❤️ {event.likeCount} likes</Text>
      </View>
      <Text style={styles.body}>{event.description}</Text>
      <View style={styles.buttonStack}>
        <PrimaryButton label="Buy Tickets" onPress={onBuyTickets} />
        <SecondaryButton label="Get Directions" onPress={onDirections} />
        <SecondaryButton label="Travel with Taxi - Coming Soon" onPress={() => Alert.alert('Coming Soon', 'InDrive / On Time Taxi integration is planned.')} />
      </View>
      {event.gallery.length > 0 && <>
        <Text style={styles.subheading}>Gallery</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>{event.gallery.map((image) => <Image key={image} source={image} style={styles.galleryImage} contentFit="cover" />)}</ScrollView>
      </>}
      <View style={styles.liveHeader}><Text style={styles.subheading}>Live Photos</Text><Text style={styles.meta}>{event.livePhotos.length}/200</Text></View>
      <View style={styles.photoGrid}>{event.livePhotos.map((image) => <Image key={image} source={image} style={styles.livePhoto} contentFit="cover" />)}</View>
      <SecondaryButton label="Upload One Photo" onPress={onUploadPhoto} />
    </View>
  </ScrollView>;
}

/* ============ PROMOTER ============ */
function PromoterScreen({ onCreate, onManage, onAuth }: { onCreate: () => void; onManage: () => void; onAuth: () => void }) {
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Text style={styles.heading}>Promoter</Text>
    <Text style={styles.body}>Sign in with Supabase Auth, verify OTP, create events, and publish after Stripe payment.</Text>
    <PrimaryButton label="Promoter Login / Signup" onPress={onAuth} />
    <SecondaryButton label="Create Event" onPress={onCreate} />
    <SecondaryButton label="Manage My Events" onPress={onManage} />
    <View style={styles.panel}><Text style={styles.subheading}>Publishing Rules</Text><Text style={styles.meta}>Paid events auto-publish after Stripe checkout. Events and media auto-delete 48 hours after end time.</Text></View>
  </ScrollView>;
}

function PromoterAuthScreen({ email, name, otp, setEmail, setName, setOtp, onSendOtp, onVerify }: { email: string; name: string; otp: string; setEmail: (v: string) => void; setName: (v: string) => void; setOtp: (v: string) => void; onSendOtp: () => void; onVerify: () => void }) {
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Text style={styles.heading}>Promoter Access</Text>
    <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={colors.dim} value={name} onChangeText={setName} />
    <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.dim} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
    <TextInput style={styles.input} placeholder="6-digit OTP" placeholderTextColor={colors.dim} value={otp} onChangeText={setOtp} keyboardType="number-pad" />
    <PrimaryButton label="Send OTP" onPress={onSendOtp} />
    <SecondaryButton label="Verify & Continue" onPress={onVerify} />
  </ScrollView>;
}

/* ============ CREATE EVENT (with date/time and 3-poster upload) ============ */
function CreateEventScreen({ onPublished }: { onPublished: (event: EventItem) => void }) {
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [price, setPrice] = useState('0');
  const [selectedGenre, setSelectedGenre] = useState('Dancehall');
  const [selectedParish, setSelectedParish] = useState('Kingston');
  const [posters, setPosters] = useState<string[]>([]);
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('20:00');
  const [endTime, setEndTime] = useState('02:00');

  async function pickPoster() {
    if (posters.length >= 3) {
      Alert.alert('Maximum reached', 'You can add up to 3 posters.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.85 });
    if (result.canceled) return;
    const compressed = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 900 } }], {
      compress: 0.75,
      format: ImageManipulator.SaveFormat.JPEG
    });
    setPosters((current) => [...current, compressed.uri]);
  }

  function removePoster(index: number) {
    setPosters((current) => current.filter((_, i) => i !== index));
  }

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Text style={styles.heading}>Create Event</Text>

    <Text style={styles.subheading}>Party Posters ({posters.length}/3)</Text>
    <Text style={styles.meta}>Add up to 3 posters. They will show as a carousel on the event page.</Text>
    <View style={styles.posterUploadRow}>
      {posters.map((uri, index) => <View key={index} style={styles.posterPreviewWrap}>
        <Image source={uri} style={styles.posterPreview} contentFit="cover" />
        <Pressable style={styles.posterRemove} onPress={() => removePoster(index)}><Text style={styles.posterRemoveText}>{icons.remove}</Text></Pressable>
      </View>)}
      {posters.length < 3 && <Pressable style={styles.posterAddButton} onPress={pickPoster}>
        <Text style={styles.posterAddIcon}>{icons.add}</Text>
        <Text style={styles.posterAddText}>Add Poster</Text>
      </Pressable>}
    </View>

    <TextInput style={styles.input} placeholder="Event title" placeholderTextColor={colors.dim} value={title} onChangeText={setTitle} />
    <TextInput style={[styles.input, styles.textarea]} placeholder="Description" placeholderTextColor={colors.dim} value={description} onChangeText={setDescription} multiline />
    <TextInput style={styles.input} placeholder="Venue" placeholderTextColor={colors.dim} value={venue} onChangeText={setVenue} />
    <TextInput style={styles.input} placeholder="Address" placeholderTextColor={colors.dim} value={address} onChangeText={setAddress} />
    
    {/* Date and Time */}
    <View style={styles.dateTimeRow}>
      <View style={styles.dateTimeField}>
        <Text style={styles.dateTimeLabel}>{icons.calendar} Date</Text>
        <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={colors.dim} value={eventDate} onChangeText={setEventDate} />
      </View>
      <View style={styles.dateTimeField}>
        <Text style={styles.dateTimeLabel}>{icons.time} Start</Text>
        <TextInput style={styles.input} placeholder="20:00" placeholderTextColor={colors.dim} value={startTime} onChangeText={setStartTime} />
      </View>
      <View style={styles.dateTimeField}>
        <Text style={styles.dateTimeLabel}>{icons.time} End</Text>
        <TextInput style={styles.input} placeholder="02:00" placeholderTextColor={colors.dim} value={endTime} onChangeText={setEndTime} />
      </View>
    </View>

    <TextInput style={styles.input} placeholder="Ticket URL" placeholderTextColor={colors.dim} value={ticketUrl} onChangeText={setTicketUrl} autoCapitalize="none" />
    <TextInput style={styles.input} placeholder="Price JMD" placeholderTextColor={colors.dim} value={price} onChangeText={setPrice} keyboardType="number-pad" />
    <Text style={styles.meta}>Genre</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>{genres.map((item) => <Chip key={item.name} label={item.name} active={selectedGenre === item.name} tint={item.color} onPress={() => setSelectedGenre(item.name)} />)}</ScrollView>
    <Text style={styles.meta}>Parish</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>{parishes.map((item) => <Chip key={item} label={item} active={selectedParish === item} onPress={() => setSelectedParish(item)} />)}</ScrollView>
    <PrimaryButton label="Pay & Publish - $500 JMD" onPress={() => {
      if (!title || !venue || !address || !eventDate) {
        Alert.alert('Missing details', 'Add a title, venue, address, and date before publishing.');
        return;
      }
      if (posters.length === 0) {
        Alert.alert('No posters', 'Add at least 1 party poster before publishing.');
        return;
      }
      onPublished({ ...demoEvents[0], id: `${Date.now()}`, title, venue, description: description || demoEvents[0].description, address, parish: selectedParish, genre: selectedGenre, priceJmd: Number(price) || 0, ticketUrl: ticketUrl || undefined, coverUrl: posters[0], posters, gallery: [], livePhotos: [], likeCount: 0, date: eventDate, startTime, endTime });
    }} />
  </ScrollView>;
}

/* ============ MANAGE EVENTS ============ */
function ManageEventsScreen({ events, onCreate, onOpen }: { events: EventItem[]; onCreate: () => void; onOpen: (event: EventItem) => void }) {
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Text style={styles.heading}>My Events</Text>
    <Text style={styles.meta}>{events.length} events • auto-delete 48h after end time</Text>
    {events.map((event) => <EventRow key={event.id} event={event} onPress={() => onOpen(event)} />)}
    <PrimaryButton label="Create New Event" onPress={onCreate} />
  </ScrollView>;
}

/* ============ PROFILE ============ */
function ProfileScreen({ onPromoter }: { onPromoter: () => void }) {
  return <View style={[styles.content, styles.center]}>
    <Text style={styles.logo}>feeedz</Text>
    <Text style={styles.meta}>Guest browsing events in Jamaica</Text>
    <PrimaryButton label="Promoter Login / Signup" onPress={onPromoter} />
    <Text style={styles.legal}>Privacy Policy • Terms • Support</Text>
  </View>;
}

/* ============ TICKET MODAL ============ */
function TicketInterestModal({ visible, onClose, onSubmit }: { visible: boolean; onClose: () => void; onSubmit: (payload: { name: string; email: string; phone: string }) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <Text style={styles.subheading}>Get Your Tickets</Text>
        <Text style={styles.meta}>Direct in-app ticketing is coming soon. Leave your details and feeedz will email your e-ticket flow when it goes live.</Text>
        <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={colors.dim} value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.dim} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={colors.dim} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <PrimaryButton label="Notify Me" onPress={() => onSubmit({ name, email, phone })} />
        <SecondaryButton label="Cancel" onPress={onClose} />
      </View>
    </View>
  </Modal>;
}

/* ============ SHARED COMPONENTS ============ */
function Section({ title, events, onOpen, horizontal }: { title: string; events: EventItem[]; onOpen: (event: EventItem) => void; horizontal?: boolean }) {
  return <View style={styles.section}><Text style={styles.subheading}>{title}</Text>{horizontal ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>{events.map((event) => <EventCard key={event.id} event={event} onPress={() => onOpen(event)} />)}</ScrollView> : events.map((event) => <EventRow key={event.id} event={event} onPress={() => onOpen(event)} />)}</View>;
}

function EventCard({ event, onPress }: { event: EventItem; onPress: () => void }) {
  return <Pressable style={styles.card} onPress={onPress}><Image source={event.coverUrl} style={styles.cardImage} contentFit="cover" /><Text style={[styles.badge, { color: genreColor(event.genre) }]}>{event.genre}</Text><Text style={styles.cardTitle}>{event.title}</Text><Text style={styles.meta}>{event.venue}, {event.parish}</Text></Pressable>;
}

function EventRow({ event, onPress }: { event: EventItem; onPress: () => void }) {
  return <Pressable style={styles.row} onPress={onPress}><Image source={event.coverUrl} style={styles.rowImage} contentFit="cover" /><View style={styles.rowCopy}><Text style={styles.cardTitle}>{event.title}</Text><Text style={styles.meta}>{event.date} • {event.venue}</Text><Text style={{ color: genreColor(event.genre), fontWeight: '800' }}>{event.priceJmd === 0 ? 'FREE' : `$${event.priceJmd.toLocaleString()} JMD`}</Text></View></Pressable>;
}

function Chip({ label, active, tint = colors.accent, onPress }: { label: string; active: boolean; tint?: string; onPress: () => void }) {
  return <Pressable style={[styles.chip, active && { borderColor: tint, backgroundColor: `${tint}22` }]} onPress={onPress}><Text style={{ color: active ? tint : colors.muted, fontWeight: '800' }}>{label}</Text></Pressable>;
}

function NavButton({ label, iconName, active, onPress }: { label: string; iconName: string; active: boolean; onPress: () => void }) {
  return <Pressable style={styles.navButton} onPress={onPress}>
    <Ionicons
      name={(active ? iconName : `${iconName}-outline`) as any}
      size={24}
      color={active ? colors.accent : 'rgba(255,255,255,0.45)'}
    />
    <Text style={{ color: active ? colors.accent : colors.dim, fontWeight: '800', fontSize: 10, marginTop: 3 }}>{label}</Text>
  </Pressable>;
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable style={styles.primaryButton} onPress={onPress}><Text style={styles.primaryText}>{label}</Text></Pressable>;
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable style={styles.secondaryButton} onPress={onPress}><Text style={styles.secondaryText}>{label}</Text></Pressable>;
}

/* ============ STYLES ============ */
const styles = StyleSheet.create({
  // Splash
  splashContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  splashLogoRow: { flexDirection: 'row', alignItems: 'baseline' },
  splashLetter: { fontSize: 56, fontWeight: '900', color: colors.text, letterSpacing: -2 },
  splashLetterAccent: { color: colors.accent, textShadowColor: 'rgba(0,255,136,0.35)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 30 },
  splashTagline: { color: colors.muted, fontSize: 14, marginTop: 12, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '500' },
  splashDots: { flexDirection: 'row', gap: 6, marginTop: 40 },
  splashDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  // App
  safeArea: { flex: 1, backgroundColor: colors.bg },
  shell: { flex: 1 },
  content: { padding: 20, paddingBottom: 110 },
  kicker: { color: colors.muted, fontWeight: '700' },
  logo: { color: colors.text, fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  heading: { color: colors.text, fontSize: 30, fontWeight: '900', marginBottom: 16 },
  subheading: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: 12 },
  title: { color: colors.text, fontSize: 32, fontWeight: '900', marginVertical: 8 },
  body: { color: '#c9c9c9', fontSize: 15, lineHeight: 23, marginBottom: 18 },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  section: { marginTop: 24 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  seeAll: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  liveIcon: { color: colors.magenta, fontSize: 16 },
  trendingIcon: { color: colors.orange, fontSize: 16 },
  hScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  // Event Card V
  eventCardV: { width: 260, marginRight: 14, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  eventCardVImage: { width: '100%', height: 170 },
  eventCardVOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 170, backgroundColor: 'rgba(0,0,0,.3)' },
  eventCardVGenreBadge: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  eventCardVGenreText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  eventCardVLiveBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: colors.magenta, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  eventCardVLiveText: { color: '#fff', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  eventCardVLivePulse: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, backgroundColor: colors.magenta },
  eventCardVPriceBadge: { position: 'absolute', bottom: 176, right: 10, backgroundColor: 'rgba(0,0,0,.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,.2)' },
  eventCardVPriceText: { color: colors.gold, fontSize: 11, fontWeight: '800' },
  eventCardVBody: { padding: 12 },
  eventCardVTitle: { color: colors.text, fontSize: 15, fontWeight: '900', marginBottom: 6, lineHeight: 20 },
  eventCardVMeta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  // Event Card H
  eventCardH: { marginBottom: 1 },
  eventCardHInner: { flexDirection: 'row', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  eventCardHImage: { width: 90, height: 90, borderRadius: 10 },
  eventCardHInfo: { flex: 1, justifyContent: 'center' },
  eventCardHHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  eventCardHGenreBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  eventCardHGenreText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  eventCardHLiveBadge: { backgroundColor: colors.magenta, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  eventCardHLiveText: { color: '#fff', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  eventCardHTitle: { color: colors.text, fontSize: 14, fontWeight: '900', marginBottom: 4 },
  eventCardHMeta: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  eventCardHPrice: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  feedHeartRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  feedHeartCount: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  // Nav
  navIcon: { fontSize: 20, marginBottom: 2, opacity: 0.5, color: '#fff' },
  navIconActive: { opacity: 1 },
  nav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 84, backgroundColor: colors.bg, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  navButton: { padding: 10, alignItems: 'center' },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerIcons: { flexDirection: 'row', gap: 10 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  headerIconText: { color: '#fff', fontSize: 16 },
  // Cards (used by Section/EventCard)
  card: { width: 260, marginRight: 14, borderRadius: 16, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.panel, overflow: 'hidden', paddingBottom: 14 },
  cardImage: { width: '100%', height: 170 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 5 },
  badge: { textTransform: 'uppercase', fontSize: 11, fontWeight: '900', margin: 12, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 14, borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: 14 },
  rowImage: { width: 92, height: 92, borderRadius: 12 },
  rowCopy: { flex: 1, justifyContent: 'center' },
  // Inputs
  input: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, color: colors.text, borderRadius: 12, padding: 15, marginBottom: 14 },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  chips: { marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, marginRight: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, marginBottom: 14 },
  searchIcon: { fontSize: 16, marginRight: 10, color: colors.dim },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 13, fontSize: 14 },
  // Pinterest grid
  pinterestGrid: { flexDirection: 'row', gap: 10, marginTop: 8 },
  pinterestColumn: { flex: 1, gap: 10 },
  posterCard: { backgroundColor: colors.panel, borderRadius: 16, borderColor: colors.border, borderWidth: 1, overflow: 'hidden', marginBottom: 0 },
  posterImage: { width: '100%' },
  posterOverlay: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 10 },
  posterGenreBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  posterGenreText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  heartButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,.55)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, gap: 4 },
  heartIcon: { fontSize: 14 },
  heartCount: { color: '#fff', fontSize: 11, fontWeight: '800' },
  posterBody: { padding: 12 },
  posterTitle: { color: colors.text, fontSize: 14, fontWeight: '900', marginBottom: 4, lineHeight: 19 },
  posterMeta: { color: colors.muted, fontSize: 11, marginBottom: 4 },
  posterPrice: { fontSize: 12, fontWeight: '800' },
  // Empty state (Favorites)
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  // Carousel (Details screen)
  carouselContainer: { position: 'relative' },
  carouselImage: { width: SCREEN_WIDTH, height: 420 },
  carouselBack: { position: 'absolute', top: 50, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,.5)', alignItems: 'center', justifyContent: 'center' },
  carouselBackText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  carouselHeart: { position: 'absolute', top: 50, right: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,.5)', alignItems: 'center', justifyContent: 'center' },
  carouselHeartIcon: { fontSize: 18 },
  carouselDots: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  carouselDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.35)' },
  carouselDotActive: { backgroundColor: colors.accent, width: 18 },
  likeRow: { marginBottom: 8 },
  likeCountText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  // Poster upload (Create Event)
  posterUploadRow: { flexDirection: 'row', gap: 10, marginBottom: 18, flexWrap: 'wrap' },
  posterPreviewWrap: { position: 'relative' },
  posterPreview: { width: 100, height: 150, borderRadius: 12 },
  posterRemove: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.magenta, alignItems: 'center', justifyContent: 'center' },
  posterRemoveText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  posterAddButton: { width: 100, height: 150, borderRadius: 12, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel },
  posterAddIcon: { color: colors.accent, fontSize: 28, fontWeight: '300' },
  posterAddText: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 4 },
  dateTimeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  dateTimeField: { flex: 1 },
  dateTimeLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  // Buttons
  buttonStack: { gap: 10, marginVertical: 18 },
  primaryButton: { backgroundColor: colors.accent, borderRadius: 12, padding: 15, alignItems: 'center', marginVertical: 6 },
  primaryText: { color: '#000', fontWeight: '900' },
  secondaryButton: { backgroundColor: colors.panel2, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 15, alignItems: 'center', marginVertical: 6 },
  secondaryText: { color: colors.text, fontWeight: '800' },
  // Details extras
  galleryImage: { width: 140, height: 100, borderRadius: 12, marginRight: 8 },
  liveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 14 },
  livePhoto: { width: '32%', aspectRatio: 1, borderRadius: 4 },
  // Misc
  panel: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 18, marginTop: 18 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  legal: { color: colors.dim, marginTop: 32 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.72)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.panel, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderColor: colors.border, borderWidth: 1 },
});