import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { FiSearch, FiUser, FiCalendar, FiClock, FiDollarSign, FiChevronRight, FiX, FiEdit2, FiTrash2, FiArrowLeft, FiLogOut } from 'react-icons/fi';
import './App.css';
import Auth from './Auth';

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

// Sample city list for autocomplete
const cities = [
  { name: 'Karachi', code: 'KHI', country: 'Pakistan' },
  { name: 'Lahore', code: 'LHE', country: 'Pakistan' },
  { name: 'Islamabad', code: 'ISB', country: 'Pakistan' },
  { name: 'Peshawar', code: 'PEW', country: 'Pakistan' },
  { name: 'Quetta', code: 'UET', country: 'Pakistan' },
  { name: 'Dubai', code: 'DXB', country: 'UAE' },
  { name: 'Abu Dhabi', code: 'AUH', country: 'UAE' },
  { name: 'London Heathrow', code: 'LHR', country: 'UK' },
  { name: 'New York JFK', code: 'JFK', country: 'USA' },
  { name: 'Toronto', code: 'YYZ', country: 'Canada' }
];

const App = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState('search');
  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  // Autocomplete state
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);

  // Selected flight state
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedReturnSeats, setSelectedReturnSeats] = useState([]);
  const [passengerDetails, setPassengerDetails] = useState([]);
  const [bookingReference, setBookingReference] = useState('');

  // Admin state
  const [newFlight, setNewFlight] = useState({
    airline: '',
    from: '',
    to: '',
    departureDate: '',
    departureTime: '10:00',
    arrivalTime: '12:00',
    price: 100,
    totalSeats: 60,
    bookedSeats: [],
    seatMap: generateSeatMap(),
    duration: '2h 0m',
    status: 'Scheduled',
    isDirect: true
  });

  // Editing flight state
  const [editingFlight, setEditingFlight] = useState(null);

  // Generate seat map (flat array)
  function generateSeatMap() {
    const rows = 10;
    const seatsPerRow = 6;
    const seatMap = [];
    for (let i = 1; i <= rows; i++) {
      for (let j = 0; j < seatsPerRow; j++) {
        seatMap.push(`${i}${String.fromCharCode(65 + j)}`);
      }
    }
    return seatMap;
  }

  // City autocomplete handler
  const handleCityInput = (value, field) => {
    const suggestions = cities.filter(city =>
      city.name.toLowerCase().includes(value.toLowerCase()) ||
      city.code.toLowerCase().includes(value.toLowerCase())
    );

    if (field === 'from') {
      setSearchParams({ ...searchParams, from: value });
      setFromSuggestions(value ? suggestions : []);
    } else {
      setSearchParams({ ...searchParams, to: value });
      setToSuggestions(value ? suggestions : []);
    }
  };

  // Select city from suggestions
  const selectCity = (city, field) => {
    const cityString = `${city.name} (${city.code})`;
    if (field === 'from') {
      setSearchParams({ ...searchParams, from: cityString });
      setFromSuggestions([]);
    } else {
      setSearchParams({ ...searchParams, to: cityString });
      setToSuggestions([]);
    }
  };

  // Handle login
  const handleLogin = (userData) => {
    setUser(userData);
    setIsAdmin(userData.isAdmin);
    setView('search');
    fetchFlights();
    fetchBookings();
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);
    setIsAdmin(false);
    setView('search');
    setFlights([]);
    setBookings([]);
  };

  // Fetch flights
  const fetchFlights = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'flights'));
      const querySnapshot = await getDocs(q);
      const flightsData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const seatMap = Array.isArray(data.seatMap[0]) ? data.seatMap.flat() : data.seatMap;
        flightsData.push({ id: doc.id, ...data, seatMap });
      });
      setFlights(flightsData);
      setError('');
    } catch (err) {
      setError('Failed to fetch flights. Please try again.', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch bookings
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'bookings'), where('userId', '==', 'guest'));
      const querySnapshot = await getDocs(q);
      const bookingsData = [];
      querySnapshot.forEach((doc) => {
        bookingsData.push({ id: doc.id, ...doc.data() });
      });
      setBookings(bookingsData);
      setError('');
    } catch (err) {
      setError('Failed to fetch bookings. Please try again.', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle flight search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchParams.from || !searchParams.to) {
      setError('Please select departure and destination cities.');
      return;
    }
    if (searchParams.from === searchParams.to) {
      setError('Departure and destination cities cannot be the same.');
      return;
    }
    if (!searchParams.departureDate) {
      setError('Please select a departure date.');
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, 'flights'),
        where('from', '==', searchParams.from),
        where('to', '==', searchParams.to),
        where('departureDate', '==', searchParams.departureDate)
      );
      const querySnapshot = await getDocs(q);
      const flightsData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const seatMap = Array.isArray(data.seatMap[0]) ? data.seatMap.flat() : data.seatMap;
        flightsData.push({ id: doc.id, ...data, seatMap });
      });
      setFlights(flightsData.filter(flight => !searchParams.directOnly || flight.isDirect));
      setView('flights');
      setError('');
    } catch (err) {
      setError('Failed to search flights. Please try again.', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle seat selection
  const handleSeatSelect = (seat, isReturn = false) => {
    const flight = isReturn ? selectedReturnFlight : selectedFlight;
    const seats = isReturn ? selectedReturnSeats : selectedSeats;
    const setSeats = isReturn ? setSelectedReturnSeats : setSelectedSeats;

    if (flight.bookedSeats.includes(seat)) return;

    if (seats.includes(seat)) {
      setSeats(seats.filter(s => s !== seat));
    } else if (seats.length < searchParams.passengers) {
      setSeats([...seats, seat]);
    }
  };

  // Handle booking
  const handleBooking = async () => {
    if (selectedSeats.length !== searchParams.passengers ||
      (searchParams.tripType === 'round-trip' && selectedReturnSeats.length !== searchParams.passengers)) {
      setError('Please select seats for all passengers.');
      return;
    }

    if (passengerDetails.some(p => !p.name || !p.passport)) {
      setError('Please fill in all passenger details.');
      return;
    }
    const bookingData = {
      flightId: selectedFlight.id,
      userId: user?.email || 'guest',
      seats: selectedSeats,
      passengers: passengerDetails,
      totalPrice: selectedFlight.price * searchParams.passengers,
      bookingDate: new Date().toISOString(),
      status: 'confirmed'
    };
    setLoading(true);
    try {
      await updateDoc(doc(db, 'flights', selectedFlight.id), {
        bookedSeats: [...selectedFlight.bookedSeats, ...selectedSeats]
      });

      const bookingData = {
        flightId: selectedFlight.id,
        userId: 'guest',
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

      const bookingRef = await addDoc(collection(db, 'bookings'), bookingData);
      setBookingReference(bookingRef.id);
      setSuccess('Booking confirmed!');
      setView('confirmation');
      setSelectedFlight(null);
      setSelectedReturnFlight(null);
      setSelectedSeats([]);
      setSelectedReturnSeats([]);
      setPassengerDetails([]);
      fetchFlights();
      fetchBookings();
    } catch (error) {
      setError('Booking failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding new flight
  const handleAddFlight = async () => {
    if (!newFlight.airline || !newFlight.from || !newFlight.to ||
      !newFlight.departureDate || !newFlight.departureTime || !newFlight.arrivalTime ||
      !newFlight.price || !newFlight.totalSeats || !newFlight.duration) {
      setError('Please fill in all required fields with valid data.');
      return;
    }
    if (newFlight.from === newFlight.to) {
      setError('Departure and destination cities cannot be the same.');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'flights'), {
        ...newFlight,
        price: Number(newFlight.price),
        totalSeats: Number(newFlight.totalSeats),
        bookedSeats: newFlight.bookedSeats || [],
        seatMap: newFlight.seatMap,
        duration: newFlight.duration,
        status: newFlight.status,
        isDirect: newFlight.isDirect
      });
      setSuccess('Flight added successfully!');
      setNewFlight({
        airline: '',
        from: '',
        to: '',
        departureDate: '',
        departureTime: '10:00',
        arrivalTime: '12:00',
        price: 100,
        totalSeats: 60,
        bookedSeats: [],
        seatMap: generateSeatMap(),
        duration: '2h 0m',
        status: 'Scheduled',
        isDirect: true
      });
      fetchFlights();
    } catch (error) {
      setError('Error adding flight: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle editing flight
  const handleEditFlight = async () => {
    if (!editingFlight.airline || !editingFlight.from || !editingFlight.to ||
      !editingFlight.departureDate || !editingFlight.departureTime || !editingFlight.arrivalTime ||
      !editingFlight.price || !editingFlight.totalSeats || !editingFlight.duration) {
      setError('Please fill in all required fields with valid data.');
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'flights', editingFlight.id), {
        ...editingFlight,
        price: Number(editingFlight.price),
        totalSeats: Number(editingFlight.totalSeats),
        seatMap: editingFlight.seatMap,
        duration: editingFlight.duration,
        status: editingFlight.status,
        isDirect: editingFlight.isDirect
      });
      setSuccess('Flight updated successfully!');
      setEditingFlight(null);
      fetchFlights();
    } catch (error) {
      setError('Error updating flight: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting flight
  const handleDeleteFlight = async (flightId) => {
    if (!window.confirm('Are you sure you want to delete this flight?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'flights', flightId));
      setSuccess('Flight deleted successfully!');
      fetchFlights();
    } catch (error) {
      setError('Error deleting flight: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle cancelling booking
  const handleCancelBooking = async (booking) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setLoading(true);
    try {
      const flightRef = doc(db, 'flights', booking.flightId);
      const flightDoc = await getDocs(query(collection(db, 'flights'), where('__name__', '==', booking.flightId)));
      const flightData = flightDoc.docs[0].data();
      await updateDoc(flightRef, {
        bookedSeats: flightData.bookedSeats.filter(seat => !booking.seats.includes(seat))
      });

      if (booking.returnFlightId) {
        const returnFlightRef = doc(db, 'flights', booking.returnFlightId);
        const returnFlightDoc = await getDocs(query(collection(db, 'flights'), where('__name__', '==', booking.returnFlightId)));
        const returnFlightData = returnFlightDoc.docs[0].data();
        await updateDoc(returnFlightRef, {
          bookedSeats: returnFlightData.bookedSeats.filter(seat => !booking.returnSeats.includes(seat))
        });
      }

      await updateDoc(doc(db, 'bookings', booking.id), { status: 'cancelled' });
      setSuccess('Booking cancelled successfully!');
      fetchBookings();
      fetchFlights();
    } catch (error) {
      setError('Error cancelling booking: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Initialize passenger details
  useEffect(() => {
    if (selectedFlight && searchParams.passengers > 0) {
      setPassengerDetails(
        Array(searchParams.passengers).fill().map(() => ({ name: '', passport: '' }))
      );
    }
  }, [selectedFlight, searchParams.passengers]);

  // Fetch data on mount
  useEffect(() => {
    fetchFlights();
    fetchBookings();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="container header-content">
          <h1 className="header-title">SkyJourney</h1>
          <div className="header-actions">
            {!isAdmin && (
              <>
                <button
                  className={`header-button ${view === 'search' ? 'active' : ''}`}
                  onClick={() => setView('search')}
                >
                  Search Flights
                </button>
                <button
                  className={`header-button ${view === 'bookings' ? 'active' : ''}`}
                  onClick={() => setView('bookings')}
                >
                  My Bookings
                </button>
              </>
            )}
            <div className="user-info">
              <span className="user-name">Welcome, {user.name}</span>
              <button
                onClick={handleLogout}
                className="logout-button"
                title="Logout"
              >
                <FiLogOut className="icon" />
                <span className="logout-text">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Loading and Messages */}
        {loading && (
          <div className="loading-overlay">
            <div className="spinner">
              <div></div>
              <p>Loading...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="message error">
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="message success">
            <p>{success}</p>
          </div>
        )}

        {/* User View */}
        {!isAdmin ? (
          <>
            {/* Search View */}
            {view === 'search' && (
              <div className="card">
                <h2 className="section-title">Find Your Flight</h2>
                <form onSubmit={handleSearch} className="search-form">
                  {/* Trip Type */}
                  <div className="trip-type">
                    <button
                      type="button"
                      className={`trip-type-button ${searchParams.tripType === 'one-way' ? 'active' : ''}`}
                      onClick={() => setSearchParams({ ...searchParams, tripType: 'one-way' })}
                    >
                      One Way
                    </button>
                    <button
                      type="button"
                      className={`trip-type-button ${searchParams.tripType === 'round-trip' ? 'active' : ''}`}
                      onClick={() => setSearchParams({ ...searchParams, tripType: 'round-trip' })}
                    >
                      Round Trip
                    </button>
                  </div>

                  {/* From/To */}
                  <div className="input-grid">
                    <div className="input-group">
                      <label className="input-label">From</label>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          value={searchParams.from}
                          onChange={(e) => handleCityInput(e.target.value, 'from')}
                          className="input-field"
                          placeholder="City or Airport"
                          required
                        />
                        <FiSearch className="icon" />
                      </div>
                      {fromSuggestions.length > 0 && (
                        <ul className="suggestions">
                          {fromSuggestions.map((city, index) => (
                            <li
                              key={index}
                              className="suggestion-item"
                              onClick={() => selectCity(city, 'from')}
                            >
                              <div className="suggestion-name">{city.name} ({city.code})</div>
                              <div className="suggestion-country">{city.country}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="input-group">
                      <label className="input-label">To</label>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          value={searchParams.to}
                          onChange={(e) => handleCityInput(e.target.value, 'to')}
                          className="input-field"
                          placeholder="City or Airport"
                          required
                        />
                        <FiSearch className="icon" />
                      </div>
                      {toSuggestions.length > 0 && (
                        <ul className="suggestions">
                          {toSuggestions.map((city, index) => (
                            <li
                              key={index}
                              className="suggestion-item"
                              onClick={() => selectCity(city, 'to')}
                            >
                              <div className="suggestion-name">{city.name} ({city.code})</div>
                              <div className="suggestion-country">{city.country}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="input-grid">
                    <div className="input-group">
                      <label className="input-label">Departure</label>
                      <div className="input-wrapper">
                        <input
                          type="date"
                          value={searchParams.departureDate}
                          onChange={(e) => setSearchParams({ ...searchParams, departureDate: e.target.value })}
                          min={new Date().toISOString().split('T')[0]}
                          className="input-field"
                          required
                        />
                        <FiCalendar className="icon" />
                      </div>
                    </div>

                    {searchParams.tripType === 'round-trip' && (
                      <div className="input-group">
                        <label className="input-label">Return</label>
                        <div className="input-wrapper">
                          <input
                            type="date"
                            value={searchParams.returnDate}
                            onChange={(e) => setSearchParams({ ...searchParams, returnDate: e.target.value })}
                            min={searchParams.departureDate || new Date().toISOString().split('T')[0]}
                            className="input-field"
                            required
                          />
                          <FiCalendar className="icon" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Passengers and Class */}
                  <div className="input-grid three-columns">
                    <div className="input-group">
                      <label className="input-label">Passengers</label>
                      <select
                        value={searchParams.passengers}
                        onChange={(e) => setSearchParams({ ...searchParams, passengers: parseInt(e.target.value) })}
                        className="input-field"
                      >
                        {[1, 2, 3, 4, 5, 6].map(num => (
                          <option key={num} value={num}>{num} {num === 1 ? 'Passenger' : 'Passengers'}</option>
                        ))}
                      </select>
                    </div>

                    <div className="input-group">
                      <label className="input-label">Class</label>
                      <select
                        value={searchParams.cabinClass}
                        onChange={(e) => setSearchParams({ ...searchParams, cabinClass: e.target.value })}
                        className="input-field"
                      >
                        <option value="economy">Economy</option>
                        <option value="business">Business</option>
                        <option value="first">First Class</option>
                      </select>
                    </div>

                    <div className="input-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={searchParams.directOnly}
                          onChange={(e) => setSearchParams({ ...searchParams, directOnly: e.target.checked })}
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">Direct flights only</span>
                      </label>
                    </div>
                  </div>

                  <button type="submit" className="primary-button">
                    Search Flights
                  </button>
                </form>
              </div>
            )}

            {/* Flights View */}
            {view === 'flights' && (
              <div>
                <button
                  onClick={() => setView('search')}
                  className="back-button"
                >
                  <FiArrowLeft className="icon" /> Back to Search
                </button>

                <h2 className="section-title">Available Flights</h2>

                {flights.length === 0 ? (
                  <div className="card empty-state">
                    <p className="empty-text">No flights found matching your criteria.</p>
                    <button
                      onClick={() => setView('search')}
                      className="primary-button"
                    >
                      Modify Search
                    </button>
                  </div>
                ) : (
                  <div className="flight-list">
                    {flights.map(flight => (
                      <div key={flight.id} className="flight-card">
                        <div className="flight-card-content">
                          <div className="flight-header">
                            <div>
                              <h3 className="flight-title">{flight.airline}</h3>
                              <p className="flight-type">{flight.isDirect ? 'Direct' : 'Connecting'} Flight</p>
                            </div>
                            <div className="flight-price">
                              <p className="price-amount">${flight.price}</p>
                              <p className="price-label">per passenger</p>
                            </div>
                          </div>

                          <div className="flight-details">
                            <div>
                              <p className="time">{flight.departureTime}</p>
                              <p className="location">{flight.from}</p>
                            </div>
                            <div className="flight-duration">
                              <p className="duration">{flight.duration}</p>
                              <div className="timeline">
                                <div className="timeline-line"></div>
                                <div className="timeline-dot"></div>
                              </div>
                            </div>
                            <div>
                              <p className="time">{flight.arrivalTime}</p>
                              <p className="location">{flight.to}</p>
                            </div>
                          </div>

                          <div className="flight-footer">
                            <span className={`status ${flight.status.toLowerCase()}`}>
                              {flight.status}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedFlight(flight);
                                setView('seats');
                              }}
                              className="primary-button"
                            >
                              Select
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Seats View */}
            {view === 'seats' && selectedFlight && (
              <div>
                <button
                  onClick={() => setView('flights')}
                  className="back-button"
                >
                  <FiArrowLeft className="icon" /> Back to Flights
                </button>

                <h2 className="section-title">
                  Select Seats for {selectedFlight.airline} Flight
                </h2>

                <div className="card">
                  <h3 className="card-title">Flight Details</h3>
                  <div className="flight-info">
                    <div>
                      <p className="info-label">From</p>
                      <p className="info-value">{selectedFlight.from}</p>
                    </div>
                    <div>
                      <p className="info-label">To</p>
                      <p className="info-value">{selectedFlight.to}</p>
                    </div>
                    <div>
                      <p className="info-label">Date</p>
                      <p className="info-value">{selectedFlight.departureDate}</p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="card-title">Seat Selection</h3>
                  <p className="seat-info">
                    Please select {searchParams.passengers} seat{searchParams.passengers > 1 ? 's' : ''} for your flight.
                  </p>

                  <div className="seat-map-container">
                    <div className="seat-map">
                      <div className="seat-map-header">
                        <div className="seat-map-row-number"></div>
                        {['A', 'B', 'C', '', 'D', 'E', 'F'].map((label, index) => (
                          <div key={index} className="seat-map-col-label">{label}</div>
                        ))}
                      </div>
                      {Array(10).fill().map((_, rowIndex) => (
                        <div key={rowIndex} className="seat-map-row">
                          <div className="seat-map-row-number">{rowIndex + 1}</div>
                          {selectedFlight.seatMap
                            .slice(rowIndex * 6, (rowIndex + 1) * 6)
                            .map(seat => (
                              <button
                                key={seat}
                                className={`seat ${selectedFlight.bookedSeats.includes(seat) ? 'booked' : selectedSeats.includes(seat) ? 'selected' : 'available'}`}
                                onClick={() => handleSeatSelect(seat)}
                                disabled={selectedFlight.bookedSeats.includes(seat)}
                              >
                                {seat}
                              </button>
                            ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {searchParams.tripType === 'round-trip' && !selectedReturnFlight && (
                  <div className="card">
                    <h3 className="card-title">Return Flight</h3>
                    <p className="return-info">
                      Please select your return flight from {searchParams.to} to {searchParams.from}.
                    </p>
                    <button
                      onClick={() => {
                        setSearchParams({
                          ...searchParams,
                          from: searchParams.to,
                          to: searchParams.from,
                          departureDate: searchParams.returnDate
                        });
                        setView('flights');
                      }}
                      className="primary-button"
                    >
                      Choose Return Flight
                    </button>
                  </div>
                )}

                {searchParams.tripType === 'round-trip' && selectedReturnFlight && (
                  <div className="card">
                    <h3 className="card-title">
                      Return Flight Seat Selection ({selectedReturnFlight.from} to {selectedReturnFlight.to})
                    </h3>
                    <p className="seat-info">
                      Please select {searchParams.passengers} seat{searchParams.passengers > 1 ? 's' : ''} for your return flight.
                    </p>

                    <div className="seat-map-container">
                      <div className="seat-map">
                        <div className="seat-map-header">
                          <div className="seat-map-row-number"></div>
                          {['A', 'B', 'C', '', 'D', 'E', 'F'].map((label, index) => (
                            <div key={index} className="seat-map-col-label">{label}</div>
                          ))}
                        </div>
                        {Array(10).fill().map((_, rowIndex) => (
                          <div key={rowIndex} className="seat-map-row">
                            <div className="seat-map-row-number">{rowIndex + 1}</div>
                            {selectedReturnFlight.seatMap
                              .slice(rowIndex * 6, (rowIndex + 1) * 6)
                              .map(seat => (
                                <button
                                  key={seat}
                                  className={`seat ${selectedReturnFlight.bookedSeats.includes(seat) ? 'booked' : selectedReturnSeats.includes(seat) ? 'selected' : 'available'}`}
                                  onClick={() => handleSeatSelect(seat, true)}
                                  disabled={selectedReturnFlight.bookedSeats.includes(seat)}
                                >
                                  {seat}
                                </button>
                              ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="card">
                  <h3 className="card-title">Passenger Information</h3>
                  <div className="passenger-list">
                    {passengerDetails.map((passenger, index) => (
                      <div key={index} className="passenger-item">
                        <h4 className="passenger-title">Passenger {index + 1}</h4>
                        <div className="passenger-form">
                          <div className="input-group">
                            <label className="input-label">Full Name</label>
                            <input
                              type="text"
                              value={passenger.name}
                              onChange={(e) => {
                                const updated = [...passengerDetails];
                                updated[index].name = e.target.value;
                                setPassengerDetails(updated);
                              }}
                              className="input-field"
                              required
                            />
                          </div>
                          <div className="input-group">
                            <label className="input-label">Passport Number</label>
                            <input
                              type="text"
                              value={passenger.passport}
                              onChange={(e) => {
                                const updated = [...passengerDetails];
                                updated[index].passport = e.target.value;
                                setPassengerDetails(updated);
                              }}
                              className="input-field"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 className="card-title">Booking Summary</h3>
                  <div className="summary-list">
                    <div className="summary-item">
                      <span className="summary-label">Outbound Flight:</span>
                      <span className="summary-value">{selectedFlight.from} to {selectedFlight.to}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Departure Date:</span>
                      <span className="summary-value">{selectedFlight.departureDate}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Selected Seats:</span>
                      <span className="summary-value">
                        {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None selected'}
                      </span>
                    </div>

                    {selectedReturnFlight && (
                      <>
                        <div className="summary-item">
                          <span className="summary-label">Return Flight:</span>
                          <span className="summary-value">{selectedReturnFlight.from} to {selectedReturnFlight.to}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Return Date:</span>
                          <span className="summary-value">{selectedReturnFlight.departureDate}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Selected Seats:</span>
                          <span className="summary-value">
                            {selectedReturnSeats.length > 0 ? selectedReturnSeats.join(', ') : 'None selected'}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="summary-section">
                      <div className="summary-item">
                        <span className="summary-label">Passengers:</span>
                        <span className="summary-value">{searchParams.passengers}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Class:</span>
                        <span className="summary-value">{searchParams.cabinClass}</span>
                      </div>
                    </div>

                    <div className="summary-total">
                      <div className="summary-item">
                        <span className="total-label">Total Price:</span>
                        <span className="total-value">
                          $
                          {(selectedFlight.price * searchParams.passengers +
                            (selectedReturnFlight ? selectedReturnFlight.price * searchParams.passengers : 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleBooking}
                      disabled={
                        selectedSeats.length !== searchParams.passengers ||
                        (searchParams.tripType === 'round-trip' && selectedReturnSeats.length !== searchParams.passengers) ||
                        passengerDetails.some(p => !p.name || !p.passport)
                      }
                      className={`primary-button ${selectedSeats.length !== searchParams.passengers ||
                          (searchParams.tripType === 'round-trip' && selectedReturnSeats.length !== searchParams.passengers) ||
                          passengerDetails.some(p => !p.name || !p.passport) ? 'disabled' : ''}`}
                    >
                      Confirm Booking
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bookings View */}
            {view === 'bookings' && (
              <div>
                <button
                  onClick={() => setView('search')}
                  className="back-button"
                >
                  <FiArrowLeft className="icon" /> Back to Search
                </button>

                <h2 className="section-title">My Bookings</h2>

                {bookings.length === 0 ? (
                  <div className="card empty-state">
                    <p className="empty-text">You don't have any bookings yet.</p>
                    <button
                      onClick={() => setView('search')}
                      className="primary-button"
                    >
                      Book a Flight
                    </button>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Booking ID</th>
                          <th>Flight</th>
                          <th>Seats</th>
                          <th>Total</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map(booking => (
                          <tr key={booking.id}>
                            <td className="booking-id">{booking.id.substring(0, 8)}</td>
                            <td className="flight-info">
                              <div>{booking.flightId}</div>
                              {booking.returnFlightId && (
                                <div className="return-flight">Return: {booking.returnFlightId}</div>
                              )}
                            </td>
                            <td className="seat-info">
                              <div>{booking.seats.join(', ')}</div>
                              {booking.returnSeats && (
                                <div className="return-seats">Return: {booking.returnSeats.join(', ')}</div>
                              )}
                            </td>
                            <td className="total-price">${booking.totalPrice.toFixed(2)}</td>
                            <td>
                              <span className={`status ${booking.status.toLowerCase()}`}>
                                {booking.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Confirmation View */}
            {view === 'confirmation' && (
              <div className="confirmation">
                <div className="check-circle">
                  <svg className="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h2 className="confirmation-title">Booking Confirmed!</h2>
                <p className="confirmation-message">Your flight has been successfully booked. A confirmation has been sent to your email.</p>

                <div className="reference">
                  <h3 className="reference-title">Booking Reference</h3>
                  <p className="reference-code">{bookingReference}</p>
                </div>

                <button
                  onClick={() => setView('search')}
                  className="primary-button"
                >
                  Book Another Flight
                </button>
              </div>
            )}
          </>
        ) : (
          /* Admin View */
          <div>
            <h2 className="section-title">Admin Dashboard</h2>

            {/* Flight Form */}
            <div className="card">
              <h3 className="card-title">{editingFlight ? 'Edit Flight' : 'Add New Flight'}</h3>

              <div className="admin-form">
                <div className="input-group">
                  <label className="input-label">Airline</label>
                  <input
                    type="text"
                    value={editingFlight ? editingFlight.airline : newFlight.airline}
                    onChange={(e) => {
                      const value = e.target.value;
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, airline: value })
                        : setNewFlight({ ...newFlight, airline: value });
                    }}
                    className="input-field"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">From</label>
                  <input
                    type="text"
                    value={editingFlight ? editingFlight.from : newFlight.from}
                    onChange={(e) => {
                      const value = e.target.value;
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, from: value })
                        : setNewFlight({ ...newFlight, from: value });
                      setFromSuggestions(
                        cities.filter(city =>
                          city.name.toLowerCase().includes(value.toLowerCase()) ||
                          city.code.toLowerCase().includes(value.toLowerCase())
                        )
                      );
                    }}
                    className="input-field"
                  />
                  {fromSuggestions.length > 0 && (
                    <ul className="suggestions">
                      {fromSuggestions.map((city, index) => (
                        <li
                          key={index}
                          className="suggestion-item"
                          onClick={() => {
                            const cityString = `${city.name} (${city.code})`;
                            editingFlight
                              ? setEditingFlight({ ...editingFlight, from: cityString })
                              : setNewFlight({ ...newFlight, from: cityString });
                            setFromSuggestions([]);
                          }}
                        >
                          <div className="suggestion-name">{city.name} ({city.code})</div>
                          <div className="suggestion-country">{city.country}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label">To</label>
                  <input
                    type="text"
                    value={editingFlight ? editingFlight.to : newFlight.to}
                    onChange={(e) => {
                      const value = e.target.value;
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, to: value })
                        : setNewFlight({ ...newFlight, to: value });
                      setToSuggestions(
                        cities.filter(city =>
                          city.name.toLowerCase().includes(value.toLowerCase()) ||
                          city.code.toLowerCase().includes(value.toLowerCase())
                        )
                      );
                    }}
                    className="input-field"
                  />
                  {toSuggestions.length > 0 && (
                    <ul className="suggestions">
                      {toSuggestions.map((city, index) => (
                        <li
                          key={index}
                          className="suggestion-item"
                          onClick={() => {
                            const cityString = `${city.name} (${city.code})`;
                            editingFlight
                              ? setEditingFlight({ ...editingFlight, to: cityString })
                              : setNewFlight({ ...newFlight, to: cityString });
                            setToSuggestions([]);
                          }}
                        >
                          <div className="suggestion-name">{city.name} ({city.code})</div>
                          <div className="suggestion-country">{city.country}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label">Departure Date</label>
                  <input
                    type="date"
                    value={editingFlight ? editingFlight.departureDate : newFlight.departureDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, departureDate: value })
                        : setNewFlight({ ...newFlight, departureDate: value });
                    }}
                    className="input-field"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Departure Time</label>
                  <input
                    type="time"
                    value={editingFlight ? editingFlight.departureTime : newFlight.departureTime}
                    onChange={(e) => {
                      const value = e.target.value;
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, departureTime: value })
                        : setNewFlight({ ...newFlight, departureTime: value });
                    }}
                    className="input-field"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Arrival Time</label>
                  <input
                    type="time"
                    value={editingFlight ? editingFlight.arrivalTime : newFlight.arrivalTime}
                    onChange={(e) => {
                      const value = e.target.value;
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, arrivalTime: value })
                        : setNewFlight({ ...newFlight, arrivalTime: value });
                    }}
                    className="input-field"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Price ($)</label>
                  <input
                    type="number"
                    value={editingFlight ? editingFlight.price : newFlight.price}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, price: value })
                        : setNewFlight({ ...newFlight, price: value });
                    }}
                    className="input-field"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Total Seats</label>
                  <input
                    type="number"
                    value={editingFlight ? editingFlight.totalSeats : newFlight.totalSeats}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, totalSeats: value })
                        : setNewFlight({ ...newFlight, totalSeats: value });
                    }}
                    className="input-field"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Duration</label>
                  <input
                    type="text"
                    value={editingFlight ? editingFlight.duration : newFlight.duration}
                    onChange={(e) => {
                      const value = e.target.value;
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, duration: value })
                        : setNewFlight({ ...newFlight, duration: value });
                    }}
                    placeholder="e.g. 2h 30m"
                    className="input-field"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Status</label>
                  <select
                    value={editingFlight ? editingFlight.status : newFlight.status}
                    onChange={(e) => {
                      const value = e.target.value;
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, status: value })
                        : setNewFlight({ ...newFlight, status: value });
                    }}
                    className="input-field"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editingFlight ? editingFlight.isDirect : newFlight.isDirect}
                      onChange={(e) => {
                        const value = e.target.checked;
                        editingFlight
                          ? setEditingFlight({ ...editingFlight, isDirect: value })
                          : setNewFlight({ ...newFlight, isDirect: value });
                      }}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">Direct Flight</span>
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button
                  onClick={editingFlight ? handleEditFlight : handleAddFlight}
                  className="primary-button"
                >
                  {editingFlight ? 'Update Flight' : 'Add Flight'}
                </button>
                {editingFlight && (
                  <button
                    onClick={() => setEditingFlight(null)}
                    className="secondary-button"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Flight Management */}
            <div className="table-container">
              <div className="table-content">
                <h3 className="card-title">Flight Management</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Airline</th>
                      <th>Route</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Price</th>
                      <th>Booked</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flights.map(flight => (
                      <tr key={flight.id}>
                        <td className="airline">{flight.airline}</td>
                        <td className="route">{flight.from} → {flight.to}</td>
                        <td className="date">{flight.departureDate}</td>
                        <td className="time">{flight.departureTime} - {flight.arrivalTime}</td>
                        <td className="price">${flight.price}</td>
                        <td className="booked">{flight.bookedSeats?.length || 0}/{flight.totalSeats}</td>
                        <td>
                          <span className={`status ${flight.status.toLowerCase()}`}>
                            {flight.status}
                          </span>
                        </td>
                        <td className="actions">
                          <div className="action-buttons">
                            <button
                              onClick={() => {
                                setSelectedFlight(flight);
                                setIsAdmin(false);
                                setView('seats');
                              }}
                              className="action-button view"
                              title="View"
                            >
                              <FiUser />
                            </button>
                            <button
                              onClick={() => setEditingFlight(flight)}
                              className="action-button edit"
                              title="Edit"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              onClick={() => handleDeleteFlight(flight.id)}
                              className="action-button delete"
                              title="Delete"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Booking Management */}
            <div className="table-container">
              <div className="table-content">
                <h3 className="card-title">Booking Management</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Flight</th>
                      <th>Seats</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(booking => (
                      <tr key={booking.id}>
                        <td className="booking-id">{booking.id.substring(0, 8)}</td>
                        <td className="flight-info">
                          <div>{booking.flightId}</div>
                          {booking.returnFlightId && (
                            <div className="return-flight">Return: {booking.returnFlightId}</div>
                          )}
                        </td>
                        <td className="seat-info">
                          <div>{booking.seats.join(', ')}</div>
                          {booking.returnSeats && (
                            <div className="return-seats">Return: {booking.returnSeats.join(', ')}</div>
                          )}
                        </td>
                        <td className="total-price">${booking.totalPrice.toFixed(2)}</td>
                        <td>
                          <span className={`status ${booking.status.toLowerCase()}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="actions">
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => handleCancelBooking(booking)}
                              className="action-button cancel"
                              title="Cancel"
                            >
                              <FiX />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      {/* <footer className="footer">
        <div className="container footer-content">
          <div className="footer-brand">
            <h2 className="footer-title">SkyJourney</h2>
            <p className="footer-slogan">Your journey starts here</p>
          </div>
          <div className="links">
            <a href="#" className="footer-link">About</a>
            <a href="#" className="footer-link">Contact</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms</a>
          </div>
        </div>
        <div className="footer-copyright">
          © {new Date().getFullYear()} SkyJourney. All rights reserved.
        </div>
      </footer> */}
    </div>
  );
};

export default App;