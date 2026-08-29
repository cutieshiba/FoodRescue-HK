import React, { useState, useMemo, useEffect } from 'react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Clock, Star, PlusCircle, Heart, ArrowLeft, 
  Search, Store, User, Filter, Sparkles, Map as MapIcon, 
  Grid, Camera, Phone, Info, MessageSquare, X, History, 
  LogOut, Plus, UserCheck, Edit3, Compass, Navigation, Bell, Leaf, Reply, Check, Trash2, AlertCircle
} from 'lucide-react';

// Fix default Leaflet icon assets bug in Vite React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom Green Glowing Pin Marker for HK Leaflet UI
const customMarkerIcon = new L.DivIcon({
  className: 'custom-leaflet-marker',
  html: `<div style="
    background: #10b981;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 3px solid #ffffff;
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 16px;
  ">🥟</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

// User Location Blue Pulse Marker
const userLocationIcon = new L.DivIcon({
  className: 'user-leaflet-marker',
  html: `<div style="
    background: #3b82f6;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 3px solid #ffffff;
    box-shadow: 0 0 20px rgba(59, 130, 246, 1);
    display: flex;
    align-items: center;
    justify-content: center;
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// All 18 Hong Kong Districts
const HK_18_DISTRICTS = [
  "Central & Western", "Wan Chai", "Eastern", "Southern",
  "Yau Tsim Mong", "Sham Shui Po", "Kowloon City", "Wong Tai Sin", "Kwun Tong",
  "Kwai Tsing", "Tsuen Wan", "Tuen Mun", "Yuen Long", "North", "Tai Po", "Sha Tin", "Sai Kung", "Islands"
];

// Helper component to center Leaflet map on position change
function MapCenterController({ center, zoom = 13 }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

// Safe Google JWT Parser
function parseGoogleJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to parse Google JWT token", e);
    return null;
  }
}

// Helper to convert dynamic timestamp to live ticking formatted countdown
function formatTimeRemaining(expiryTimestamp) {
  const diff = expiryTimestamp - Date.now();
  if (diff <= 0) return "Expired";

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

// Helper to format ISO datetime-local string to local readable format
function formatDateTimeLocal(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const INITIAL_SHOPS = {
  "shop-1": {
    id: "shop-1",
    name: "Kam Wah Bakery (金華冰廳)",
    district: "Yau Tsim Mong",
    address: "47 Bute St, Mong Kok, Hong Kong",
    phone: "+852 2392 6830",
    operatingHours: "06:30 AM - 11:30 PM",
    bio: "Famous traditional Hong Kong Cha Chaan Teng renowned for signature pineapple buns and egg tarts.",
    dietaryTags: ["Halal Friendly", "Vegetarian Options"],
    lat: 22.3224,
    lng: 114.1694,
    rating: 4.8,
    ownerEmail: "owner@foodrescue.hk",
    reviews: [
      { 
        id: 1, 
        user: "Alex C.", 
        rating: 5, 
        comment: "Best pineapple buns in HK! Grabbed their surplus box.", 
        date: "2026-08-25",
        reply: "Thank you Alex! Fresh baked daily at 4 PM."
      }
    ],
    pastListings: [
      { id: "p1", item: "Fresh Egg Tart Box (6pcs)", price: 20.00, originalPrice: 60.00, date: "Yesterday" }
    ]
  },
  "shop-2": {
    id: "shop-2",
    name: "Bakehouse Central",
    district: "Central & Western",
    address: "14 Staunton St, Central, Hong Kong",
    phone: "+852 2333 8812",
    operatingHours: "08:00 AM - 09:00 PM",
    bio: "Artisanal bakery led by Chef Gregoire Michaud specializing in sourdoughs and European pastries.",
    dietaryTags: ["Organic Ingredients", "Plastic Free"],
    lat: 22.2819,
    lng: 114.1531,
    rating: 4.9,
    ownerEmail: "owner@foodrescue.hk",
    reviews: [
      { id: 1, user: "Kevin L.", rating: 5, comment: "The sourdough bread box was huge and delicious!", date: "2026-08-27" }
    ],
    pastListings: [
      { id: "p3", item: "Sourdough Bread & Croissant Bag", price: 35.00, originalPrice: 110.00, date: "2 days ago" }
    ]
  }
};

const INITIAL_LISTINGS = [
  {
    id: "l1",
    shopId: "shop-1",
    shopName: "Kam Wah Bakery (金華冰廳)",
    district: "Yau Tsim Mong",
    address: "47 Bute St, Mong Kok, Hong Kong",
    item: "Pineapple Buns & Egg Tart Set",
    category: "Bakery",
    originalPrice: 60.00,
    discountPrice: 18.00,
    expiryTimestamp: Date.now() + 1000 * 60 * 90, // Expires in 1.5 hours
    lat: 22.3224,
    lng: 114.1694,
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "l2",
    shopId: "shop-2",
    shopName: "Bakehouse Central",
    district: "Central & Western",
    address: "14 Staunton St, Central, Hong Kong",
    item: "Assorted Pastry Surprise Bag",
    category: "Bakery",
    originalPrice: 120.00,
    discountPrice: 38.00,
    expiryTimestamp: Date.now() + 1000 * 60 * 45, // Expires in 45 minutes
    lat: 22.2819,
    lng: 114.1531,
    imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80"
  }
];

export default function App() {
  const [role, setRole] = useState('landing');
  const [viewMode, setViewMode] = useState('grid');
  
  // Real Google User Auth & Profile State
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Onboarding Form Inputs
  const [onboardingForm, setOnboardingForm] = useState({ username: '', role: 'customer' });
  
  // Favorites & Alerts State
  const [favoritedShops, setFavoritedShops] = useState(["shop-1"]);
  const [favoritedDistricts, setFavoritedDistricts] = useState(["Central & Western", "Yau Tsim Mong"]);
  const [notificationToast, setNotificationToast] = useState(null);

  // Stats State (Environmental Impact Tracker)
  const [impactStats, setImpactStats] = useState({ totalKgRescued: 1248, totalCo2Saved: 3.12 });

  // Shops & Inventory State (With LocalStorage Persistence)
  const [shops, setShops] = useState(() => {
    const saved = localStorage.getItem('hk_rescue_shops');
    return saved ? JSON.parse(saved) : INITIAL_SHOPS;
  });

  const [listings, setListings] = useState(() => {
    const saved = localStorage.getItem('hk_rescue_listings');
    return saved ? JSON.parse(saved) : INITIAL_LISTINGS;
  });

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [activeMerchantShopId, setActiveMerchantShopId] = useState("shop-1");
  const [isRegisteringNewShop, setIsRegisteringNewShop] = useState(false);

  // Merchant Shop Management Hub State
  const [editingShop, setEditingShop] = useState(null);
  const [replyInputMap, setReplyInputMap] = useState({});

  // Map & Location State
  const [userCoords, setUserCoords] = useState(null);
  const [mapCenterOverride, setMapCenterOverride] = useState(null);
  const [mapZoom, setMapZoom] = useState(13);
  const [registrationCoords, setRegistrationCoords] = useState([22.2819, 114.1581]);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [maxPrice, setMaxPrice] = useState(100);

  // Forms State
  const [newShopForm, setNewShopForm] = useState({
    name: '',
    district: 'Central & Western',
    address: '',
    phone: '',
    operatingHours: '08:00 AM - 10:00 PM',
    bio: '',
    dietaryTagInput: 'Halal Friendly, Plastic Free'
  });

  const [listingForm, setListingForm] = useState({
    item: '',
    category: 'Bakery',
    originalPrice: '',
    discountPrice: '',
    expiryDateLocal: '',
    imagePreview: null
  });

  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });

  // Persist Shops & Listings to Local Storage
  useEffect(() => {
    localStorage.setItem('hk_rescue_shops', JSON.stringify(shops));
  }, [shops]);

  useEffect(() => {
    localStorage.setItem('hk_rescue_listings', JSON.stringify(listings));
  }, [listings]);

  // LIVE COUNTDOWN TIMER & AUTO-REMOVE EXPIRED LISTINGS
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);

      // Auto-remove expired listings smoothly in real-time
      setListings((prevListings) => {
        const active = prevListings.filter((item) => item.expiryTimestamp > now);
        if (active.length !== prevListings.length) {
          triggerNotificationToast("⏰ An expired food listing was automatically removed!");
        }
        return active;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Filter Shops owned by currently logged-in user
  const ownedShops = useMemo(() => {
    if (!user) return Object.values(shops);
    const userOwned = Object.values(shops).filter(s => s.ownerEmail === user.email);
    return userOwned.length > 0 ? userOwned : Object.values(shops);
  }, [shops, user]);

  // Auto-Geocode address typing using Nominatim API
  const handleAddressChange = async (addressText) => {
    setNewShopForm(prev => ({ ...prev, address: addressText }));
    if (addressText.trim().length < 3) return;

    setIsGeocoding(true);
    try {
      const query = encodeURIComponent(`${addressText}, Hong Kong`);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        setRegistrationCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      }
    } catch (err) {
      console.error("Auto-location failed", err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Browser "Near Me" Geolocation Trigger
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setUserCoords(coords);
        setMapCenterOverride(coords);
        setMapZoom(15);
        setViewMode('map');
        triggerNotificationToast("📍 Map Centered to Your Current HK Location!");
      },
      () => {
        alert("Unable to fetch location. Please check browser location permissions.");
      }
    );
  };

  // Favoriting System Logic
  const toggleFavoriteShop = (shopId) => {
    setFavoritedShops(prev => 
      prev.includes(shopId) ? prev.filter(id => id !== shopId) : [...prev, shopId]
    );
  };

  const toggleFavoriteDistrict = (districtName) => {
    setFavoritedDistricts(prev => 
      prev.includes(districtName) ? prev.filter(d => d !== districtName) : [...prev, districtName]
    );
  };

  const triggerNotificationToast = (msg) => {
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(null), 5000);
  };

  // Google Login Success
  const handleGoogleSuccess = (credentialResponse) => {
    if (credentialResponse?.credential) {
      const decoded = parseGoogleJwt(credentialResponse.credential);
      if (decoded) {
        const initialUserData = {
          name: decoded.name,
          username: decoded.given_name || decoded.name.split(' ')[0],
          email: decoded.email,
          avatar: decoded.picture,
          googleId: decoded.sub,
          role: null
        };
        setUser(initialUserData);
        setOnboardingForm({ username: initialUserData.username, role: 'customer' });
        setShowAuthModal(false);
        setShowOnboardingModal(true);
      }
    }
  };

  const handleOnboardingComplete = (e) => {
    e.preventDefault();
    if (!onboardingForm.username.trim()) return;

    setUser({ ...user, username: onboardingForm.username, role: onboardingForm.role });
    setShowOnboardingModal(false);
    setRole(onboardingForm.role === 'shop' ? 'shop' : 'user');
  };

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    setRole('landing');
  };

  // Register New Restaurant
  const handleRegisterShopSubmit = (e) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const newId = `shop-${Date.now()}`;
    const createdShop = {
      id: newId,
      name: newShopForm.name,
      district: newShopForm.district,
      address: newShopForm.address,
      phone: newShopForm.phone,
      operatingHours: newShopForm.operatingHours,
      bio: newShopForm.bio,
      dietaryTags: newShopForm.dietaryTagInput.split(',').map(t => t.trim()).filter(Boolean),
      lat: registrationCoords[0],
      lng: registrationCoords[1],
      rating: 5.0,
      ownerEmail: user.email,
      reviews: [],
      pastListings: []
    };

    setShops({ ...shops, [newId]: createdShop });
    setActiveMerchantShopId(newId);
    setIsRegisteringNewShop(false);
    setNewShopForm({ name: '', district: 'Central & Western', address: '', phone: '', operatingHours: '08:00 AM - 10:00 PM', bio: '', dietaryTagInput: '' });
    alert(`🎉 Restaurant "${createdShop.name}" registered with auto-geocoded map pin!`);
  };

  // Edit Existing Shop Details (Merchant Feature)
  const handleUpdateShopDetails = (e) => {
    e.preventDefault();
    if (!editingShop) return;

    setShops({
      ...shops,
      [editingShop.id]: { ...editingShop }
    });
    alert(`✅ Shop info for "${editingShop.name}" updated successfully!`);
  };

  // Merchant Reply to Review Feature
  const handleMerchantReplySubmit = (shopId, reviewId) => {
    const replyText = replyInputMap[reviewId];
    if (!replyText || !replyText.trim()) return;

    const shop = shops[shopId];
    const updatedReviews = shop.reviews.map(r => {
      if (r.id === reviewId) {
        return { ...r, reply: replyText.trim() };
      }
      return r;
    });

    setShops({
      ...shops,
      [shopId]: { ...shop, reviews: updatedReviews }
    });

    setReplyInputMap({ ...replyInputMap, [reviewId]: '' });
  };

  // Publish Listing with Exact Expiry Timestamp
  const handleListingSubmit = (e) => {
    e.preventDefault();
    const activeShop = shops[activeMerchantShopId];
    if (!activeShop) return;

    const expiryTime = new Date(listingForm.expiryDateLocal).getTime();
    if (!expiryTime || expiryTime <= Date.now()) {
      alert("Please select a future expiry date and time.");
      return;
    }

    const newEntry = {
      id: `l-${Date.now()}`,
      shopId: activeMerchantShopId,
      shopName: activeShop.name,
      district: activeShop.district || "Central & Western",
      address: activeShop.address,
      item: listingForm.item,
      category: listingForm.category,
      originalPrice: parseFloat(listingForm.originalPrice) || 0,
      discountPrice: parseFloat(listingForm.discountPrice) || 0,
      expiryTimestamp: expiryTime,
      lat: activeShop.lat,
      lng: activeShop.lng,
      imageUrl: listingForm.imagePreview || "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80"
    };

    setListings([newEntry, ...listings]);

    // Update Environmental Impact Stats
    setImpactStats(prev => ({
      totalKgRescued: prev.totalKgRescued + 1.5,
      totalCo2Saved: parseFloat((prev.totalCo2Saved + 0.00375).toFixed(2))
    }));

    // Check Notifications for Favorited Shop or District
    if (favoritedShops.includes(activeShop.id) || favoritedDistricts.includes(activeShop.district)) {
      triggerNotificationToast(`🔔 Alert: ${activeShop.name} posted new surplus item "${newEntry.item}"!`);
    }

    setListingForm({ item: '', category: 'Bakery', originalPrice: '', discountPrice: '', expiryDateLocal: '', imagePreview: null });
    alert("Food item published live with auto-expiration!");
  };

  // Manual Delete Listing Action (Merchant Feature)
  const handleDeleteListing = (id) => {
    setListings((prev) => prev.filter((item) => item.id !== id));
    triggerNotificationToast("🗑️ Listing manually removed.");
  };

  // Customer Reviews Handler
  const handleAddReview = (e) => {
    e.preventDefault();
    if (!newReview.comment.trim() || !selectedShopId) return;

    const shop = shops[selectedShopId];
    const updatedReviewList = [
      { id: Date.now(), user: user ? `@${user.username}` : "Anonymous Foodie", rating: Number(newReview.rating), comment: newReview.comment, date: new Date().toISOString().split('T')[0] },
      ...shop.reviews
    ];

    const avgRating = (updatedReviewList.reduce((acc, r) => acc + r.rating, 0) / updatedReviewList.length).toFixed(1);

    setShops({
      ...shops,
      [selectedShopId]: { ...shop, rating: parseFloat(avgRating), reviews: updatedReviewList }
    });

    setNewReview({ rating: 5, comment: '' });
  };

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const matchesSearch = 
        item.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.address.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDistrict = selectedDistrict === 'All' || item.district === selectedDistrict;
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesPrice = item.discountPrice <= maxPrice;

      return matchesSearch && matchesDistrict && matchesCategory && matchesPrice;
    });
  }, [listings, searchQuery, selectedDistrict, selectedCategory, maxPrice]);

  const mapCenter = useMemo(() => {
    if (mapCenterOverride) return mapCenterOverride;
    if (filteredListings.length > 0) return [filteredListings[0].lat, filteredListings[0].lng];
    return [22.2819, 114.1581];
  }, [filteredListings, mapCenterOverride]);

  const selectedShop = selectedShopId ? shops[selectedShopId] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden pb-12">
      
      {/* Background Ambient Glow */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-500/20 rounded-full blur-[140px] pointer-events-none" />

      {/* NOTIFICATION TOAST ALERT */}
      {notificationToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-slate-950 px-4 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 border border-white/20 animate-bounce">
          <Bell size={16} className="fill-slate-950" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-900/50 border-b border-white/10 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => setRole('landing')}>
            <div className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-400/30">
              <Sparkles size={20} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">FoodRescue HK</h1>
              <p className="text-xs text-emerald-300">Hong Kong • 18 Districts Zero Waste</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {user ? (
              <div 
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-2xl cursor-pointer transition"
              >
                <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-400" />
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-white leading-tight">@{user.username}</p>
                  <p className="text-[10px] text-emerald-400 leading-tight uppercase font-extrabold">{user.role || 'Member'}</p>
                </div>
                <Edit3 size={12} className="text-slate-400 ml-1" />
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="bg-white hover:bg-slate-100 text-slate-900 px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition"
              >
                Sign in with Google
              </button>
            )}

            {role !== 'landing' && (
              <button 
                onClick={() => setRole('landing')}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl font-medium transition text-xs flex items-center gap-1.5 border border-white/20"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
          </div>
        </div>
      </header>

      {/* LANDING PAGE */}
      {role === 'landing' && (
        <main className="max-w-4xl mx-auto px-4 pt-10 sm:pt-14 pb-12 text-center relative z-10">
          <div className="inline-flex flex-wrap items-center justify-center gap-3 bg-slate-900/80 border border-emerald-500/40 px-5 py-2.5 rounded-full mb-8 shadow-xl">
            <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
              <Leaf size={16} /> Live HK Impact Tracker:
            </div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                🌱 {impactStats.totalKgRescued.toLocaleString()} kg food rescued
              </span>
              <span>•</span>
              <span className="bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-lg border border-teal-500/30">
                ☁️ {impactStats.totalCo2Saved} tons CO₂ saved
              </span>
            </div>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Connect HK Restaurants across 18 Districts
          </h2>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mt-4">
            Manage your restaurants, respond to customer reviews, auto-locate shops on map, and rescue surplus food before it expires.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto mt-10">
            <div 
              onClick={() => {
                if (!user) {
                  setShowAuthModal(true);
                } else {
                  setRole('shop');
                }
              }}
              className="bg-white/5 border border-white/10 backdrop-blur-lg p-8 rounded-3xl hover:bg-white/10 hover:border-emerald-400/50 transition-all cursor-pointer text-left group"
            >
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/30">
                <Store size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Shop Owner Portal</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Click your owned shops to edit info, manage & reply to customer reviews, and post daily surplus boxes with custom expiration times.
              </p>
              <span className="mt-6 text-sm font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                {user ? "Manage My HK Shops →" : "Sign in & Access Portal →"}
              </span>
            </div>

            <div 
              onClick={() => setRole('user')}
              className="bg-white/5 border border-white/10 backdrop-blur-lg p-8 rounded-3xl hover:bg-white/10 hover:border-emerald-400/50 transition-all cursor-pointer text-left group"
            >
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/30">
                <User size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Customer & Food Hunter</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Filter across all 18 HK districts, use live countdown timers to grab expiring items, and get real-time alerts.
              </p>
              <span className="mt-6 text-sm font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Browse 18 HK Districts →
              </span>
            </div>
          </div>
        </main>
      )}

      {/* MERCHANT DASHBOARD & SHOP OWNER HUB */}
      {role === 'shop' && (
        <main className="max-w-4xl mx-auto px-4 mt-8 relative z-10 space-y-6">
          
          {/* OWNER PROFILE & REGISTER BUTTON */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Merchant Portal</p>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <img src={user?.avatar} alt="" className="w-6 h-6 rounded-full" /> @{user?.username || user?.name}
              </h3>
            </div>

            <button 
              onClick={() => setIsRegisteringNewShop(!isRegisteringNewShop)}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-lg"
            >
              <Plus size={16} /> {isRegisteringNewShop ? "Cancel Registration" : "Register New HK Restaurant"}
            </button>
          </div>

          {/* QUICK-ACCESS BUTTONS FOR OWNER'S SHOPS */}
          {!isRegisteringNewShop && (
            <div className="bg-slate-900/80 border border-emerald-500/30 backdrop-blur-xl p-6 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Store size={18} /> My Owned Restaurants & Shops ({ownedShops.length})
                </h3>
                <span className="text-xs text-slate-400">Click a shop to edit info & manage listings</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                {ownedShops.map((shop) => {
                  const isSelected = activeMerchantShopId === shop.id;
                  const reviewCount = shop.reviews?.length || 0;
                  const pendingReplies = shop.reviews?.filter(r => !r.reply).length || 0;

                  return (
                    <button
                      key={shop.id}
                      onClick={() => {
                        setActiveMerchantShopId(shop.id);
                        setEditingShop({ ...shop });
                      }}
                      className={`p-5 rounded-2xl text-left border transition-all flex flex-col justify-between relative group ${
                        isSelected 
                          ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/50 shadow-xl' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-emerald-400/40'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-extrabold text-base text-white group-hover:text-emerald-300 transition-colors">
                            {shop.name}
                          </h4>
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                            ★ {shop.rating}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 flex items-center gap-1 mb-1">
                          <MapPin size={12} className="text-emerald-400" /> {shop.district} • {shop.address}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                        <span className="text-slate-300 flex items-center gap-1 font-medium">
                          <MessageSquare size={13} className="text-emerald-400" /> {reviewCount} Reviews
                        </span>

                        {pendingReplies > 0 ? (
                          <span className="bg-red-500/20 text-red-300 border border-red-500/30 font-bold px-2.5 py-0.5 rounded-md text-[10px]">
                            {pendingReplies} Needs Reply
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                            <Check size={12} /> Manage Shop
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SHOP MANAGEMENT PANEL: EDIT DETAILS, ACTIVE LISTINGS & REPLIES */}
          {!isRegisteringNewShop && shops[activeMerchantShopId] && (
            <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl space-y-8">
              
              {/* EDIT SHOP DETAILS SECTION */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <Edit3 size={18} className="text-emerald-400" /> Edit Info: {shops[activeMerchantShopId].name}
                  </h3>
                  <span className="text-xs text-emerald-300 font-mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                    District: {shops[activeMerchantShopId].district}
                  </span>
                </div>

                <form onSubmit={handleUpdateShopDetails} className="space-y-4 bg-slate-900/60 p-5 rounded-2xl border border-white/10">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Phone Number</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-950 border border-white/15 p-2.5 rounded-xl text-white text-xs"
                        value={editingShop?.phone || shops[activeMerchantShopId].phone}
                        onChange={(e) => setEditingShop({ ...editingShop, phone: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Operating Hours</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-950 border border-white/15 p-2.5 rounded-xl text-white text-xs"
                        value={editingShop?.operatingHours || shops[activeMerchantShopId].operatingHours}
                        onChange={(e) => setEditingShop({ ...editingShop, operatingHours: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Shop Bio / Pickup Directions</label>
                    <textarea 
                      rows={2}
                      className="w-full bg-slate-950 border border-white/15 p-2.5 rounded-xl text-white text-xs"
                      value={editingShop?.bio || shops[activeMerchantShopId].bio}
                      onChange={(e) => setEditingShop({ ...editingShop, bio: e.target.value })}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md"
                  >
                    Save Changes to Shop Info
                  </button>
                </form>
              </div>

              {/* MERCHANT ACTIVE SURPLUS LISTINGS & DELETE MANAGEMENT */}
              <div className="border-t border-white/10 pt-6">
                <h3 className="font-bold text-lg text-white mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock size={18} className="text-emerald-400" /> Active Surplus Items for {shops[activeMerchantShopId].name}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">Auto-deletes when timer hits zero</span>
                </h3>

                {listings.filter(l => l.shopId === activeMerchantShopId).length === 0 ? (
                  <p className="text-slate-400 text-xs italic bg-slate-900/40 p-4 rounded-xl text-center border border-white/5">
                    No active listings posted yet. Use the form below to post a surplus item with an expiration time.
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {listings.filter(l => l.shopId === activeMerchantShopId).map((item) => {
                      const remaining = formatTimeRemaining(item.expiryTimestamp);
                      return (
                        <div key={item.id} className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl flex justify-between items-center gap-3">
                          <div>
                            <h4 className="font-bold text-white text-sm">{item.item}</h4>
                            <p className="text-xs text-emerald-400 font-extrabold mt-0.5">HK${item.discountPrice.toFixed(2)}</p>
                            <p className="text-[11px] text-amber-400 font-mono mt-1 flex items-center gap-1">
                              <Clock size={11} /> Live Timer: {remaining}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteListing(item.id)}
                            className="bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 p-2.5 rounded-xl transition"
                            title="Delete Listing Immediately"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* REPLY TO CUSTOMER REVIEWS SECTION */}
              <div className="border-t border-white/10 pt-6">
                <h3 className="font-bold text-lg text-white flex items-center gap-2 mb-4">
                  <MessageSquare size={18} className="text-emerald-400" /> Customer Reviews & Replies
                </h3>

                {shops[activeMerchantShopId].reviews.length === 0 ? (
                  <p className="text-slate-400 text-xs italic bg-slate-900/40 p-4 rounded-xl text-center border border-white/5">
                    No customer reviews yet for this restaurant.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {shops[activeMerchantShopId].reviews.map((rev) => (
                      <div key={rev.id} className="bg-slate-900/80 border border-white/10 p-4 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white text-xs">{rev.user}</span>
                          <span className="text-amber-400 text-xs font-bold">★ {rev.rating}.0</span>
                        </div>
                        <p className="text-slate-300 text-xs">{rev.comment}</p>

                        {/* Existing Owner Reply */}
                        {rev.reply ? (
                          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl ml-4 text-xs">
                            <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                              <Reply size={12} /> Owner Response:
                            </span>
                            <p className="text-emerald-200 mt-1">{rev.reply}</p>
                          </div>
                        ) : (
                          /* Reply Input Box */
                          <div className="pt-2 flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Write a response to this customer..." 
                              className="flex-1 bg-slate-950 border border-white/15 px-3 py-1.5 rounded-xl text-xs text-white placeholder-slate-500"
                              value={replyInputMap[rev.id] || ''}
                              onChange={(e) => setReplyInputMap({ ...replyInputMap, [rev.id]: e.target.value })}
                            />
                            <button 
                              onClick={() => handleMerchantReplySubmit(shops[activeMerchantShopId].id, rev.id)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 transition"
                            >
                              <Reply size={12} /> Post Reply
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* UPLOAD SURPLUS LISTING WITH EXPIRY DATE */}
              <div className="border-t border-white/10 pt-6">
                <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                  <PlusCircle size={18} className="text-emerald-400" /> Upload Food Listing for {shops[activeMerchantShopId].name}
                </h3>

                <form onSubmit={handleListingSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Food Photo Upload</label>
                    <div className="border-2 border-dashed border-white/20 rounded-2xl p-4 text-center bg-slate-900/40 hover:border-emerald-400/50 transition cursor-pointer relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setListingForm({ ...listingForm, imagePreview: reader.result });
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      {listingForm.imagePreview ? (
                        <div className="relative h-40 w-full rounded-xl overflow-hidden">
                          <img src={listingForm.imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <span className="absolute bottom-2 right-2 bg-slate-950/80 text-emerald-400 text-xs px-2 py-1 rounded-md font-bold">
                            Change Photo
                          </span>
                        </div>
                      ) : (
                        <div className="py-4 flex flex-col items-center justify-center text-slate-400">
                          <Camera size={28} className="text-emerald-400 mb-1" />
                          <p className="text-xs font-bold text-slate-200">Upload Real Surplus Photo</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Food Item Name</label>
                      <input 
                        required 
                        type="text" 
                        placeholder="e.g. Sourdough Loaf Set" 
                        className="w-full bg-slate-900/60 border border-white/15 p-3 rounded-xl text-white text-sm" 
                        value={listingForm.item}
                        onChange={(e) => setListingForm({ ...listingForm, item: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Category</label>
                      <select 
                        className="w-full bg-slate-900/60 border border-white/15 p-3 rounded-xl text-white text-sm"
                        value={listingForm.category}
                        onChange={(e) => setListingForm({ ...listingForm, category: e.target.value })}
                      >
                        <option value="Bakery" className="bg-slate-900 text-white">Bakery & Dim Sum</option>
                        <option value="Meals" className="bg-slate-900 text-white">Prepared Meals</option>
                        <option value="Produce" className="bg-slate-900 text-white">Groceries & Produce</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Original HKD ($)</label>
                      <input 
                        required 
                        type="number" 
                        placeholder="80.00" 
                        className="w-full bg-slate-900/60 border border-white/15 p-3 rounded-xl text-white text-sm" 
                        value={listingForm.originalPrice}
                        onChange={(e) => setListingForm({ ...listingForm, originalPrice: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Discount HKD ($)</label>
                      <input 
                        required 
                        type="number" 
                        placeholder="25.00" 
                        className="w-full bg-slate-900/60 border border-white/15 p-3 rounded-xl text-white text-sm" 
                        value={listingForm.discountPrice}
                        onChange={(e) => setListingForm({ ...listingForm, discountPrice: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* EXPIRY DATE & TIME SELECTION */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                      Expiry Date & Time (Listing Auto-Removes When Reached)
                    </label>
                    <input 
                      required 
                      type="datetime-local" 
                      className="w-full bg-slate-900/60 border border-white/15 p-3 rounded-xl text-white text-sm" 
                      value={listingForm.expiryDateLocal}
                      onChange={(e) => setListingForm({ ...listingForm, expiryDateLocal: e.target.value })}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold py-3.5 rounded-xl transition shadow-lg"
                  >
                    Publish Surplus Listing Live
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* REGISTER NEW RESTAURANT FORM */}
          {isRegisteringNewShop && (
            <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                  <Store size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Register HK Restaurant</h2>
                  <p className="text-slate-300 text-xs">Owner: <span className="text-emerald-400 font-bold">@{user?.username}</span></p>
                </div>
              </div>

              <form onSubmit={handleRegisterShopSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Restaurant / Bakery Name</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. Tsui Wah Restaurant" 
                      className="w-full bg-slate-900/60 border border-white/15 p-3 rounded-xl text-white text-sm" 
                      value={newShopForm.name}
                      onChange={(e) => setNewShopForm({ ...newShopForm, name: e.target.value })}
                    />
                  </div>

                  {/* 18 HK DISTRICTS DROPDOWN */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">HK District (18 Districts)</label>
                    <select 
                      className="w-full bg-slate-900/60 border border-white/15 p-3 rounded-xl text-white text-sm"
                      value={newShopForm.district}
                      onChange={(e) => setNewShopForm({ ...newShopForm, district: e.target.value })}
                    >
                      {HK_18_DISTRICTS.map((d) => (
                        <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Street Address (Auto-Geocodes Map Pin)</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. 47 Bute St, Mong Kok" 
                      className="w-full bg-slate-900/60 border border-white/15 p-3 rounded-xl text-white text-sm" 
                      value={newShopForm.address}
                      onChange={(e) => handleAddressChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Phone Number</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="+852 2888 9999" 
                      className="w-full bg-slate-900/60 border border-white/15 p-3 rounded-xl text-white text-sm" 
                      value={newShopForm.phone}
                      onChange={(e) => setNewShopForm({ ...newShopForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* AUTO-GEOCODED MAP PREVIEW */}
                <div className="border border-white/15 rounded-2xl overflow-hidden bg-slate-900 p-3 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <Compass size={14}/> Auto-Detected Map Location {isGeocoding && "(Locating...)"}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {registrationCoords[0].toFixed(4)}, {registrationCoords[1].toFixed(4)}
                    </span>
                  </div>
                  <div className="h-48 w-full rounded-xl overflow-hidden border border-white/10">
                    <MapContainer center={registrationCoords} zoom={14} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapCenterController center={registrationCoords} zoom={14} />
                      <Marker position={registrationCoords} icon={customMarkerIcon} />
                    </MapContainer>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Description & Pickup Notes</label>
                  <textarea 
                    required 
                    placeholder="Describe fresh baking times, pickup instructions..." 
                    className="w-full bg-slate-900/60 border border-white/15 p-3 rounded-xl text-white text-sm" 
                    rows={2}
                    value={newShopForm.bio}
                    onChange={(e) => setNewShopForm({ ...newShopForm, bio: e.target.value })}
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold py-3.5 rounded-xl transition shadow-lg mt-2"
                >
                  Save Restaurant & Launch Profile
                </button>
              </form>
            </div>
          )}
        </main>
      )}

      {/* CONSUMER MAP & LISTINGS VIEW */}
      {role === 'user' && (
        <main className="max-w-6xl mx-auto px-4 mt-6 relative z-10">
          
          {/* FAVORITE DISTRICT ALERT BAR */}
          <div className="bg-slate-900/70 border border-white/10 p-3.5 rounded-2xl mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <Bell size={16} className="text-emerald-400" />
              <span>Favorite Districts for Alerts:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-none">
              {HK_18_DISTRICTS.map((dist) => {
                const isFav = favoritedDistricts.includes(dist);
                return (
                  <button
                    key={dist}
                    onClick={() => toggleFavoriteDistrict(dist)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
                      isFav 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50' 
                        : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
                    }`}
                  >
                    <Heart size={10} className={isFav ? "fill-emerald-400 text-emerald-400" : ""} /> {dist}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-4 sm:p-6 rounded-3xl shadow-2xl mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Search food, Mong Kok, Central, Shatin..." 
                  className="w-full pl-12 pr-4 py-3 bg-slate-900/60 border border-white/15 rounded-2xl text-white placeholder-slate-400 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={handleGetLocation}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                >
                  <Navigation size={14} /> Near Me
                </button>

                <div className="flex items-center p-1 bg-slate-900/80 border border-white/10 rounded-2xl">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      viewMode === 'grid' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Grid size={14} /> Cards
                  </button>
                  <button 
                    onClick={() => setViewMode('map')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      viewMode === 'map' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <MapIcon size={14} /> HK Map
                  </button>
                </div>
              </div>
            </div>

            {/* 18 DISTRICT FILTER BAR */}
            <div className="space-y-2 pt-1 border-t border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-300 uppercase">Filter by HK District (18 Districts):</span>
                {selectedDistrict !== 'All' && (
                  <button onClick={() => setSelectedDistrict('All')} className="text-xs text-emerald-400 underline font-bold">
                    Clear District Filter
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedDistrict('All')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                    selectedDistrict === 'All' 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  All Districts
                </button>
                {HK_18_DISTRICTS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDistrict(d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                      selectedDistrict === d 
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {['All', 'Bakery', 'Meals', 'Produce'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      selectedCategory === cat 
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' 
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 bg-slate-900/40 border border-white/10 px-4 py-2 rounded-2xl min-w-[240px]">
                <Filter size={16} className="text-slate-400" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                    <span>Max Price:</span>
                    <span className="text-emerald-400">HK${maxPrice}.00</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="200" 
                    step="5"
                    className="w-full accent-emerald-400 cursor-pointer"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          {viewMode === 'map' ? (
            <div className="bg-slate-900/60 border border-white/15 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl h-[520px] relative z-10">
              <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapCenterController center={mapCenter} zoom={mapZoom} />

                {userCoords && (
                  <Marker position={userCoords} icon={userLocationIcon}>
                    <Popup>
                      <div className="font-bold text-xs text-blue-900">📍 You Are Here</div>
                    </Popup>
                  </Marker>
                )}

                {filteredListings.map((item) => {
                  const remaining = formatTimeRemaining(item.expiryTimestamp);
                  return (
                    <Marker key={item.id} position={[item.lat, item.lng]} icon={customMarkerIcon}>
                      <Popup>
                        <div className="p-1 min-w-[200px]">
                          <h4 className="font-bold text-slate-900 text-sm">{item.item}</h4>
                          <button 
                            onClick={() => setSelectedShopId(item.shopId)}
                            className="text-emerald-700 text-xs font-bold hover:underline flex items-center gap-1 my-1"
                          >
                            <Info size={12} /> {item.shopName}
                          </button>
                          <div className="flex justify-between items-baseline mt-2 pt-2 border-t border-slate-200">
                            <span className="font-black text-slate-900 text-base">HK${item.discountPrice.toFixed(2)}</span>
                            <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                              <Clock size={11} /> {remaining}
                            </span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((item) => {
                const shop = shops[item.shopId] || {};
                const isFav = favoritedShops.includes(item.shopId);
                const discountPercent = Math.round(((item.originalPrice - item.discountPrice) / item.originalPrice) * 100);
                const remaining = formatTimeRemaining(item.expiryTimestamp);

                return (
                  <div key={item.id} className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:border-emerald-400/40 transition-all flex flex-col justify-between group">
                    <div>
                      <div className="h-48 w-full overflow-hidden relative bg-slate-900">
                        <img src={item.imageUrl} alt={item.item} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        
                        <button 
                          onClick={() => toggleFavoriteShop(item.shopId)}
                          className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white backdrop-blur-md transition"
                        >
                          <Heart size={16} className={isFav ? "fill-red-500 text-red-500" : "text-white"} />
                        </button>

                        <span className="absolute top-3 left-3 text-xs font-extrabold uppercase text-emerald-300 bg-slate-950/80 border border-emerald-500/30 px-3 py-1 rounded-lg backdrop-blur-md">
                          {item.district}
                        </span>

                        {/* LIVE EXPIRY BADGE ON IMAGE */}
                        <div className="absolute bottom-3 left-3 right-3 bg-slate-950/80 border border-red-500/40 px-3 py-1.5 rounded-xl backdrop-blur-md flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-300 flex items-center gap-1 text-[11px]">
                            <Clock size={12} className="text-red-400" /> Expires in:
                          </span>
                          <span className="text-red-400 font-extrabold">{remaining}</span>
                        </div>
                      </div>

                      <div className="p-5">
                        <h3 className="font-bold text-lg text-white leading-snug group-hover:text-emerald-400 transition-colors">
                          {item.item}
                        </h3>

                        <button 
                          onClick={() => setSelectedShopId(item.shopId)}
                          className="text-emerald-400 hover:underline text-xs font-bold mt-1.5 flex items-center gap-1"
                        >
                          <Store size={12}/> {item.shopName}
                        </button>

                        <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                          <MapPin size={12} /> {item.address}
                        </p>

                        <div className="flex items-baseline gap-2 mt-4">
                          <span className="text-2xl font-black text-white">HK${item.discountPrice.toFixed(2)}</span>
                          <span className="text-xs text-slate-400 line-through">HK${item.originalPrice.toFixed(2)}</span>
                          <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-md ml-auto">
                            {discountPercent}% OFF
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-3.5 bg-black/30 border-t border-white/10 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star size={14} className="fill-amber-400"/>
                        <span>{shop.rating || 5.0}</span>
                      </div>

                      <button 
                        onClick={() => setSelectedShopId(item.shopId)}
                        className="bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold transition"
                      >
                        Shop Info & Reviews
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* GOOGLE AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/20 rounded-3xl max-w-sm w-full p-6 text-center relative shadow-2xl">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X size={18} />
            </button>

            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            </div>

            <h3 className="text-xl font-bold text-white mb-1">Sign in with Google</h3>
            <p className="text-xs text-slate-300 mb-6">Log in to manage your shops and get district surplus alerts.</p>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => alert('Google Sign-In failed')}
                useOneTap
              />
            </div>
          </div>
        </div>
      )}

      {/* ONBOARDING MODAL */}
      {showOnboardingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl max-w-md w-full p-6 relative shadow-2xl space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
                <UserCheck size={28} />
              </div>
              <h3 className="text-xl font-bold text-white">Welcome to FoodRescue HK!</h3>
              <p className="text-xs text-slate-300 mt-1">Set your username and select your role to continue.</p>
            </div>

            <form onSubmit={handleOnboardingComplete} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Choose Username</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 text-sm font-bold">@</span>
                  <input 
                    required 
                    type="text" 
                    className="w-full bg-slate-950 border border-white/20 pl-8 pr-4 py-2.5 rounded-xl text-white font-bold text-sm focus:ring-2 focus:ring-emerald-400"
                    value={onboardingForm.username}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, username: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-2">Account Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setOnboardingForm({ ...onboardingForm, role: 'customer' })}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition ${
                      onboardingForm.role === 'customer' 
                        ? 'bg-emerald-500/20 border-emerald-400 text-white' 
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <User size={20} className={onboardingForm.role === 'customer' ? 'text-emerald-400' : 'text-slate-400'} />
                    <p className="font-bold text-xs mt-2 text-white">Customer</p>
                    <p className="text-[10px] text-slate-300 leading-snug mt-1">Browse & rescue food listings</p>
                  </div>

                  <div 
                    onClick={() => setOnboardingForm({ ...onboardingForm, role: 'shop' })}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition ${
                      onboardingForm.role === 'shop' 
                        ? 'bg-emerald-500/20 border-emerald-400 text-white' 
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <Store size={20} className={onboardingForm.role === 'shop' ? 'text-emerald-400' : 'text-slate-400'} />
                    <p className="font-bold text-xs mt-2 text-white">Shop Owner</p>
                    <p className="text-[10px] text-slate-300 leading-snug mt-1">Register shops & reply reviews</p>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold py-3.5 rounded-xl transition shadow-lg"
              >
                Complete Setup & Enter App
              </button>
            </form>
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {showProfileModal && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/20 rounded-3xl max-w-sm w-full p-6 relative shadow-2xl space-y-5">
            <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X size={18} />
            </button>

            <div className="text-center">
              <img src={user.avatar} alt="" className="w-16 h-16 rounded-full mx-auto ring-4 ring-emerald-400 mb-2" />
              <h3 className="text-lg font-bold text-white">{user.name}</h3>
              <p className="text-xs text-emerald-400 font-mono">{user.email}</p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">@</span>
                  <input 
                    type="text" 
                    className="w-full bg-slate-950 border border-white/20 pl-7 pr-3 py-2 rounded-xl text-white text-xs font-bold"
                    value={user.username}
                    onChange={(e) => setUser({ ...user, username: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Active Role</label>
                <select 
                  className="w-full bg-slate-950 border border-white/20 p-2.5 rounded-xl text-white text-xs font-bold"
                  value={user.role}
                  onChange={(e) => {
                    setUser({ ...user, role: e.target.value });
                    setRole(e.target.value);
                  }}
                >
                  <option value="customer">Customer / Food Hunter</option>
                  <option value="shop">Shop Owner / Merchant</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
              <button 
                onClick={handleLogout} 
                className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1"
              >
                <LogOut size={14} /> Sign Out
              </button>

              <button 
                onClick={() => setShowProfileModal(false)} 
                className="bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHOP DETAILS POPUP MODAL (CUSTOMER VIEW) */}
      {selectedShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/20 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl space-y-6">
            <button onClick={() => setSelectedShopId(null)} className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300">
              <X size={18} />
            </button>

            <div>
              <div className="flex justify-between items-center">
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">HK Verified Restaurant</span>
                <span className="text-slate-300 text-xs font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                  {selectedShop.district}
                </span>
              </div>
              
              <h2 className="text-2xl font-black text-white mt-1">{selectedShop.name}</h2>
              <p className="text-slate-300 text-xs mt-1 flex items-center gap-1">
                <MapPin size={13} className="text-emerald-400" /> {selectedShop.address}
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300 border-y border-white/10 py-3">
                <span className="flex items-center gap-1"><Clock size={14} className="text-emerald-400"/> {selectedShop.operatingHours}</span>
                <span className="flex items-center gap-1"><Phone size={14} className="text-emerald-400"/> {selectedShop.phone}</span>
                <span className="flex items-center gap-1 text-amber-400 font-bold"><Star size={14} className="fill-amber-400"/> {selectedShop.rating} Rating</span>
              </div>

              <p className="text-slate-300 text-xs mt-3">{selectedShop.bio}</p>

              <div className="flex flex-wrap gap-2 mt-3">
                {selectedShop.dietaryTags.map((tag, idx) => (
                  <span key={idx} className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-md font-bold">
                    ✓ {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Past Surplus Listings */}
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mb-3">
                <History size={16} className="text-emerald-400" /> Past Listings History
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {selectedShop.pastListings.map((past) => (
                  <div key={past.id} className="bg-white/5 border border-white/10 p-3 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-white">{past.item}</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">{past.date}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-emerald-400 block">HK${past.price.toFixed(2)}</span>
                      <span className="line-through text-slate-500 text-[10px]">HK${past.originalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Reviews & Official Owner Responses */}
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mb-3">
                <MessageSquare size={16} className="text-emerald-400" /> Customer Ratings & Official Responses
              </h3>

              <form onSubmit={handleAddReview} className="bg-slate-950/60 p-4 rounded-2xl border border-white/10 mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">Leave a Review</label>
                  <select 
                    value={newReview.rating}
                    onChange={(e) => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                    className="bg-slate-900 border border-white/15 text-xs text-amber-400 font-bold px-2 py-1 rounded-lg"
                  >
                    <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                    <option value="4">⭐⭐⭐⭐ (4/5)</option>
                  </select>
                </div>
                <textarea 
                  required
                  placeholder="Share your pickup experience..." 
                  className="w-full bg-slate-900/80 border border-white/15 p-2.5 rounded-xl text-xs text-white placeholder-slate-400"
                  rows={2}
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                />
                <button type="submit" className="bg-emerald-500 text-slate-950 font-bold text-xs py-2 px-4 rounded-xl transition w-full">
                  Post Review
                </button>
              </form>

              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {selectedShop.reviews.map((rev) => (
                  <div key={rev.id} className="bg-white/5 p-3.5 rounded-2xl border border-white/5 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{rev.user}</span>
                      <span className="text-amber-400 font-bold">★ {rev.rating}.0</span>
                    </div>
                    <p className="text-slate-300">{rev.comment}</p>

                    {/* Official Merchant Reply Display */}
                    {rev.reply && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl ml-3">
                        <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                          <Reply size={12} /> Response from {selectedShop.name}:
                        </span>
                        <p className="text-emerald-200 text-[11px] mt-0.5">{rev.reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}