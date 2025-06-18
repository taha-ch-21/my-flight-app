import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, where,
  onAuthStateChanged, getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut 
} from 'firebase/firestore';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBBOgkcqPF1SxHiznl_zPSuAwpli1xbdqo",
  authDomain: "lolopopo-b824d.firebaseapp.com",
  projectId: "lolopopo-b824d",
  storageBucket: "lolopopo-b824d.appspot.com",
  messagingSenderId: "808576798168",
  appId: "1:808576798168:web:8db1a56546a1ca333af6ad",
  measurementId: "G-R7ZVG9WYXN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Sample city list
const cities = ['New York', 'London', 'Paris', 'Tokyo', 'Sydney', 'Dubai', 'Singapore'];

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState('search');
  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authView, setAuthView] = useState('login'); // 'login' or 'signup'

  // Search form state
  const [searchParams, setSearchParams] = useState({
    tripType: 'one-way',
    from: '',
    to: '',
    departureDate: '',
    returnDate: '',
    passengers: 1,
    cabinClass: 'economy',
    directOnly: false
  });

  // Authentication state
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: ''
  });

  // Selected flight state
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedReturnSeats, setSelectedReturnSeats] = useState([]);
  const [passengerDetails, setPassengerDetails] = useState([]);

  // Handle user authentication
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authView === 'signup') {
        await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        toast.success('Account created successfully!');
        setAuthView('login');
      } else {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
        toast.success('Logged in successfully!');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      toast.success('Logged out successfully!');
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Fetch user's bookings
  const fetchBookings = async (userId) => {
    if (!userId) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'bookings'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const bookingsData = [];
      querySnapshot.forEach((doc) => {
        bookingsData.push({ id: doc.id, ...doc.data() });
      });
      setBookings(bookingsData);
    } catch (err) {
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  // Handle booking
  const handleBooking = async () => {
    if (!currentUser) {
      toast.error('Please login to book flights');
      return;
    }
    
    setLoading(true);
    try {
      // Update flight with booked seats
      await updateDoc(doc(db, 'flights', selectedFlight.id), {
        bookedSeats: [...selectedFlight.bookedSeats, ...selectedSeats]
      });

      const bookingData = {
        flightId: selectedFlight.id,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        seats: selectedSeats,
        passengers: passengerDetails,
        totalPrice: selectedFlight.price * searchParams.passengers,
        bookingDate: new Date().toISOString(),
        status: 'confirmed'
      };

      if (searchParams.tripType === 'round-trip' && selectedReturnFlight) {
        await updateDoc(doc(db, 'flights', selectedReturnFlight.id), {
          bookedSeats: [...selectedReturnFlight.bookedSeats, ...selectedReturnSeats]
        });
        bookingData.returnFlightId = selectedReturnFlight.id;
        bookingData.returnSeats = selectedReturnSeats;
        bookingData.totalPrice += selectedReturnFlight.price * searchParams.passengers;
      }

      await addDoc(collection(db, 'bookings'), bookingData);
      toast.success('Booking confirmed!');
      fetchBookings(currentUser.uid);
      setView('bookings');
    } catch (error) {
      toast.error('Booking failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        fetchBookings(user.uid);
      } else {
        setBookings([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Rest of your existing flight search, seat selection, and admin functions...

  return (
    <div className="app-container">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <header className="app-header">
        <div className="container">
          <h1>Flight Booking System</h1>
          <nav>
            {currentUser ? (
              <>
                <button onClick={() => setView('search')}>Search Flights</button>
                <button onClick={() => setView('bookings')}>My Bookings</button>
                {isAdmin && (
                  <button onClick={() => setIsAdmin(true)}>Admin Panel</button>
                )}
                <button onClick={handleLogout}>Logout</button>
                <span className="user-email">{currentUser.email}</span>
              </>
            ) : (
              <>
                <button onClick={() => setAuthView('login')}>Login</button>
                <button onClick={() => setAuthView('signup')}>Sign Up</button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="container">
        {loading && <div className="loading-overlay">Loading...</div>}

        {!currentUser ? (
          <div className="auth-container">
            <h2>{authView === 'login' ? 'Login' : 'Sign Up'}</h2>
            <form onSubmit={handleAuth}>
              {authView === 'signup' && (
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                    required
                  />
                </div>
              )}
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                  required
                />
              </div>
              <button type="submit" className="primary-button">
                {authView === 'login' ? 'Login' : 'Sign Up'}
              </button>
              <p>
                {authView === 'login' 
                  ? "Don't have an account? " 
                  : "Already have an account? "}
                <button 
                  type="button" 
                  className="text-button"
                  onClick={() => setAuthView(authView === 'login' ? 'signup' : 'login')}
                >
                  {authView === 'login' ? 'Sign Up' : 'Login'}
                </button>
              </p>
            </form>
          </div>
        ) : (
          <>
            {view === 'search' && (
              <div className="search-container">
                <h2>Find Your Flight</h2>
                {/* Your existing search form with improved styling */}
              </div>
            )}

            {view === 'bookings' && (
              <div className="bookings-container">
                <h2>My Bookings</h2>
                {bookings.length === 0 ? (
                  <div className="empty-state">
                    <p>No bookings found</p>
                    <button 
                      className="primary-button"
                      onClick={() => setView('search')}
                    >
                      Book a Flight
                    </button>
                  </div>
                ) : (
                  <div className="booking-cards">
                    {bookings.map(booking => (
                      <div key={booking.id} className="booking-card">
                        <div className="booking-header">
                          <h3>Booking #{booking.id.substring(0, 8)}</h3>
                          <span className={`status-badge ${booking.status}`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="booking-details">
                          <p><strong>Flight:</strong> {booking.flightId}</p>
                          <p><strong>Seats:</strong> {booking.seats.join(', ')}</p>
                          <p><strong>Total:</strong> ${booking.totalPrice}</p>
                          <p><strong>Date:</strong> {new Date(booking.bookingDate).toLocaleString()}</p>
                        </div>
                        {booking.status === 'confirmed' && (
                          <button 
                            className="danger-button"
                            onClick={() => handleCancelBooking(booking)}
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rest of your views (flights, seats, admin, etc.) */}
          </>
        )}
      </main>

      <footer className="app-footer">
        <div className="container">
          <p>© 2023 Flight Booking System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;