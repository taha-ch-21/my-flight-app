import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
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

const cities = [
  'New York', 'London', 'Paris', 'Tokyo', 'Sydney', 'Dubai', 'Singapore',
  'Los Angeles', 'Chicago', 'Hong Kong', 'Miami', 'Toronto', 'Mumbai'
];

const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState('search');
  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedReturnSeats, setSelectedReturnSeats] = useState([]);
  const [passengerDetails, setPassengerDetails] = useState([]);
  const [bookingReference, setBookingReference] = useState('');

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

  const [editingFlight, setEditingFlight] = useState(null);

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

  const handleCityInput = (value, field) => {
    const suggestions = cities.filter(city =>
      city.toLowerCase().startsWith(value.toLowerCase())
    );
    if (field === 'from') {
      setSearchParams({ ...searchParams, from: value });
      setFromSuggestions(value ? suggestions : []);
    } else {
      setSearchParams({ ...searchParams, to: value });
      setToSuggestions(value ? suggestions : []);
    }
  };

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
      setError('Failed to fetch flights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      setError('Failed to fetch bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!cities.includes(searchParams.from) || !cities.includes(searchParams.to)) {
      setError('Please select valid cities from the suggestions.');
      return;
    }
    if (searchParams.from === searchParams.to) {
      setError('Departure and destination cities cannot be the same.');
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
      setError('Failed to search flights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  const handleBooking = async () => {
    if (selectedSeats.length !== searchParams.passengers ||
        (searchParams.tripType === 'round-trip' && selectedReturnSeats.length !== searchParams.passengers)) {
      setError('Please select seats for all passengers.');
      return;
    }
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

  const handleAddFlight = async () => {
    if (!newFlight.airline || !cities.includes(newFlight.from) || !cities.includes(newFlight.to) ||
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

  const handleEditFlight = async () => {
    if (!editingFlight.airline || !cities.includes(editingFlight.from) || !cities.includes(editingFlight.to) ||
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

  useEffect(() => {
    if (selectedFlight && searchParams.passengers > 0) {
      setPassengerDetails(
        Array(searchParams.passengers).fill().map(() => ({ name: '', passport: '' }))
      );
    }
  }, [selectedFlight, searchParams.passengers]);

  useEffect(() => {
    fetchFlights();
    fetchBookings();
  }, []);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div className="min-h-screen">
      <header>
        <div className="container flex">
          <h1>Flight Booking System</h1>
          <div className="flex">
            <button
              className="bg-blue"
              onClick={() => {
                setIsAdmin(false);
                setView('search');
              }}
            >
              Search Flights
            </button>
            <button
              className="bg-blue"
              onClick={() => {
                setIsAdmin(false);
                setView('bookings');
              }}
            >
              My Bookings
            </button>
            <button
              className="bg-blue"
              onClick={() => setIsAdmin(!isAdmin)}
            >
              {isAdmin ? 'User View' : 'Admin Panel'}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {!isAdmin ? (
          <>
            {view === 'search' ? (
              <div className="search-section glass-card">
                <h2 className="section-title">Search Flights</h2>
                <form onSubmit={handleSearch}>
                  <div className="form-group">
                    <label>Trip Type</label>
                    <select
                      value={searchParams.tripType}
                      onChange={(e) => setSearchParams({ ...searchParams, tripType: e.target.value })}
                    >
                      <option value="one-way">One-way</option>
                      <option value="round-trip">Round-trip</option>
                    </select>
                  </div>

                  <div className="flex">
                    <div className="autocomplete form-group">
                      <label>From</label>
                      <input
                        type="text"
                        value={searchParams.from}
                        onChange={(e) => handleCityInput(e.target.value, 'from')}
                        required
                      />
                      {fromSuggestions.length > 0 && (
                        <ul className="suggestions">
                          {fromSuggestions.map((city, index) => (
                            <li
                              key={index}
                              onClick={() => {
                                setSearchParams({ ...searchParams, from: city });
                                setFromSuggestions([]);
                              }}
                            >
                              {city}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="autocomplete form-group">
                      <label>To</label>
                      <input
                        type="text"
                        value={searchParams.to}
                        onChange={(e) => handleCityInput(e.target.value, 'to')}
                        required
                      />
                      {toSuggestions.length > 0 && (
                        <ul className="suggestions">
                          {toSuggestions.map((city, index) => (
                            <li
                              key={index}
                              onClick={() => {
                                setSearchParams({ ...searchParams, to: city });
                                setToSuggestions([]);
                              }}
                            >
                              {city}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="flex">
                    <div className="form-group">
                      <label>Departure</label>
                      <input
                        type="date"
                        value={searchParams.departureDate}
                        onChange={(e) => setSearchParams({ ...searchParams, departureDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                    {searchParams.tripType === 'round-trip' && (
                      <div className="form-group">
                        <label>Return</label>
                        <input
                          type="date"
                          value={searchParams.returnDate}
                          onChange={(e) => setSearchParams({ ...searchParams, returnDate: e.target.value })}
                          min={searchParams.departureDate}
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex">
                    <div className="form-group">
                      <label>Passengers</label>
                      <select
                        value={searchParams.passengers}
                        onChange={(e) => setSearchParams({ ...searchParams, passengers: parseInt(e.target.value) })}
                      >
                        {[1, 2, 3, 4, 5, 6].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Class</label>
                      <select
                        value={searchParams.cabinClass}
                        onChange={(e) => setSearchParams({ ...searchParams, cabinClass: e.target.value })}
                      >
                        <option value="economy">Economy</option>
                        <option value="business">Business</option>
                        <option value="first">First Class</option>
                      </select>
                    </div>
                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={searchParams.directOnly}
                          onChange={(e) => setSearchParams({ ...searchParams, directOnly: e.target.checked })}
                        />
                        <span>Direct flights only</span>
                      </label>
                    </div>
                  </div>

                  <button type="submit" className="bg-blue">
                    Search Flights
                  </button>
                </form>
              </div>
            ) : view === 'flights' ? (
              <div className="flights-section glass-card">
                <div className="flex justify-between align-center">
                  <h2 className="section-title">Available Flights</h2>
                  <button
                    className="bg-gray"
                    onClick={() => setView('search')}
                  >
                    Back to Search
                  </button>
                </div>
                {flights.length === 0 ? (
                  <p className="no-results">No flights found. Try different search criteria.</p>
                ) : (
                  <div className="flights-grid">
                    {flights.map(flight => (
                      <div key={flight.id} className="flight-card">
                        <div className="flight-header">
                          <h3>{flight.airline}</h3>
                          <span className="price">${flight.price}</span>
                        </div>
                        <div className="flight-details">
                          <div className="flight-time">
                            <p className="time">{flight.departureTime}</p>
                            <p className="city">{flight.from}</p>
                          </div>
                          <div className="flight-duration">
                            <p>{flight.duration}</p>
                            <div className="flight-line">
                              <div className="flight-dot"></div>
                              <div className="flight-line-main"></div>
                              <div className="flight-dot"></div>
                            </div>
                            <p className={flight.isDirect ? 'direct' : 'indirect'}>
                              {flight.isDirect ? 'Direct' : 'Non-direct'}
                            </p>
                          </div>
                          <div className="flight-time">
                            <p className="time">{flight.arrivalTime}</p>
                            <p className="city">{flight.to}</p>
                          </div>
                        </div>
                        <p className="flight-status">Status: {flight.status}</p>
                        <button
                          className="bg-blue"
                          onClick={() => {
                            setSelectedFlight(flight);
                            setView('seats');
                          }}
                        >
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : view === 'seats' ? (
              <div className="seats-section glass-card">
                <div className="flex justify-between align-center">
                  <h2 className="section-title">
                    Select Seats for {selectedFlight.airline} ({selectedFlight.from} to {selectedFlight.to})
                  </h2>
                  <button
                    className="bg-gray"
                    onClick={() => setView('flights')}
                  >
                    Back to Flights
                  </button>
                </div>

                <div className="seat-selection">
                  <h3>Seat Map</h3>
                  <div className="seat-map">
                    <div className="seat-map-header"></div>
                    {['A', 'B', 'C', '', 'D', 'E', 'F'].map((label, index) => (
                      <div key={index} className="seat-label">{label}</div>
                    ))}
                    {Array(10).fill().map((_, rowIndex) => (
                      <div key={rowIndex} className="seat-row">
                        <div className="row-number">{rowIndex + 1}</div>
                        {selectedFlight.seatMap
                          .slice(rowIndex * 6, (rowIndex + 1) * 6)
                          .map(seat => (
                            <button
                              key={seat}
                              className={`seat ${selectedFlight.bookedSeats.includes(seat)
                                ? 'booked'
                                : selectedSeats.includes(seat)
                                ? 'selected'
                                : 'available'}`}
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

                {searchParams.tripType === 'round-trip' && !selectedReturnFlight && (
                  <div className="return-flight">
                    <h3>Select Return Flight</h3>
                    <button
                      className="bg-blue"
                      onClick={() => {
                        setSearchParams({
                          ...searchParams,
                          from: searchParams.to,
                          to: searchParams.from,
                          departureDate: searchParams.returnDate
                        });
                        setView('flights');
                      }}
                    >
                      Choose Return Flight
                    </button>
                  </div>
                )}

                {searchParams.tripType === 'round-trip' && selectedReturnFlight && (
                  <div className="seat-selection">
                    <h3>
                      Return Flight Seat Map ({selectedReturnFlight.from} to {selectedReturnFlight.to})
                    </h3>
                    <div className="seat-map">
                      <div className="seat-map-header"></div>
                      {['A', 'B', 'C', '', 'D', 'E', 'F'].map((label, index) => (
                        <div key={index} className="seat-label">{label}</div>
                      ))}
                      {Array(10).fill().map((_, rowIndex) => (
                        <div key={rowIndex} className="seat-row">
                          <div className="row-number">{rowIndex + 1}</div>
                          {selectedReturnFlight.seatMap
                            .slice(rowIndex * 6, (rowIndex + 1) * 6)
                            .map(seat => (
                              <button
                                key={seat}
                                className={`seat ${selectedReturnFlight.bookedSeats.includes(seat)
                                  ? 'booked'
                                  : selectedReturnSeats.includes(seat)
                                  ? 'selected'
                                  : 'available'}`}
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
                )}

                <div className="passenger-info">
                  <h3>Passenger Information</h3>
                  {passengerDetails.map((passenger, index) => (
                    <div key={index} className="passenger-form">
                      <h4>Passenger {index + 1}</h4>
                      <div className="flex">
                        <div className="form-group">
                          <label>Full Name</label>
                          <input
                            type="text"
                            value={passenger.name}
                            onChange={(e) => {
                              const updated = [...passengerDetails];
                              updated[index].name = e.target.value;
                              setPassengerDetails(updated);
                            }}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Passport Number</label>
                          <input
                            type="text"
                            value={passenger.passport}
                            onChange={(e) => {
                              const updated = [...passengerDetails];
                              updated[index].passport = e.target.value;
                              setPassengerDetails(updated);
                            }}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="booking-summary">
                  <h3>Booking Summary</h3>
                  <div className="summary-item">
                    <span>Flight:</span>
                    <span>{selectedFlight.from} to {selectedFlight.to}</span>
                  </div>
                  <div className="summary-item">
                    <span>Date:</span>
                    <span>{selectedFlight.departureDate}</span>
                  </div>
                  <div className="summary-item">
                    <span>Selected Seats:</span>
                    <span>{selectedSeats.join(', ') || 'None'}</span>
                  </div>
                  {selectedReturnFlight && (
                    <>
                      <div className="summary-item">
                        <span>Return Flight:</span>
                        <span>{selectedReturnFlight.from} to {selectedReturnFlight.to}</span>
                      </div>
                      <div className="summary-item">
                        <span>Return Date:</span>
                        <span>{selectedReturnFlight.departureDate}</span>
                      </div>
                      <div className="summary-item">
                        <span>Return Seats:</span>
                        <span>{selectedReturnSeats.join(', ') || 'None'}</span>
                      </div>
                    </>
                  )}
                  <div className="summary-item total">
                    <span>Total Price:</span>
                    <span>$
                      {(selectedFlight.price * searchParams.passengers +
                        (selectedReturnFlight ? selectedReturnFlight.price * searchParams.passengers : 0)).toFixed(2)}
                    </span>
                  </div>
                  <button
                    className="bg-blue confirm-booking"
                    onClick={handleBooking}
                    disabled={
                      selectedSeats.length !== searchParams.passengers ||
                      (searchParams.tripType === 'round-trip' && selectedReturnSeats.length !== searchParams.passengers) ||
                      passengerDetails.some(p => !p.name || !p.passport)
                    }
                  >
                    Confirm Booking
                  </button>
                </div>
              </div>
            ) : view === 'bookings' ? (
              <div className="bookings-section glass-card">
                <div className="flex justify-between align-center">
                  <h2 className="section-title">My Bookings</h2>
                  <button
                    className="bg-gray"
                    onClick={() => setView('search')}
                  >
                    Back to Search
                  </button>
                </div>
                {bookings.length === 0 ? (
                  <p className="no-results">No bookings found.</p>
                ) : (
                  <div className="bookings-table">
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
                            <td>{booking.id.substring(0, 8)}</td>
                            <td>
                              {booking.flightId}
                              {booking.returnFlightId && <><br />Return: {booking.returnFlightId}</>}
                            </td>
                            <td>
                              {booking.seats.join(', ')}
                              {booking.returnSeats && <><br />Return: {booking.returnSeats.join(', ')}</>}
                            </td>
                            <td>${booking.totalPrice}</td>
                            <td>{booking.status}</td>
                            <td>
                              {booking.status === 'confirmed' && (
                                <button
                                  className="bg-red"
                                  onClick={() => handleCancelBooking(booking)}
                                >
                                  Cancel
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : view === 'confirmation' ? (
              <div className="confirmation-section glass-card">
                <h2 className="section-title">Booking Confirmed!</h2>
                <div className="confirmation-details">
                  <p>Your booking has been successfully placed.</p>
                  <p><strong>Booking Reference:</strong> {bookingReference}</p>
                  <div className="confirmation-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <button
                  className="bg-blue"
                  onClick={() => setView('search')}
                >
                  Back to Search
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="admin-section glass-card">
            <h2 className="section-title">Admin Dashboard</h2>

            <div className="admin-form">
              <h3>{editingFlight ? 'Edit Flight' : 'Add New Flight'}</h3>
              <div className="flex">
                <div className="form-group">
                  <label>Airline</label>
                  <input
                    type="text"
                    value={editingFlight ? editingFlight.airline : newFlight.airline}
                    onChange={(e) => {
                      const value = e.target.value;
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, airline: value })
                        : setNewFlight({ ...newFlight, airline: value });
                    }}
                  />
                </div>
                <div className="autocomplete form-group">
                  <label>From</label>
                  <input
                    type="text"
                    value={editingFlight ? editingFlight.from : newFlight.from}
                    onChange={(e) => {
                      const value = e.target.value;
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, from: value })
                        : setNewFlight({ ...newFlight, from: value });
                      const suggestions = cities.filter(city => city.toLowerCase().startsWith(value.toLowerCase()));
                      setFromSuggestions(suggestions);
                    }}
                  />
                  {fromSuggestions.length > 0 && (
                    <ul className="suggestions">
                      {fromSuggestions.map((city, index) => (
                        <li
                          key={index}
                          onClick={() => {
                            editingFlight
                              ? setEditingFlight({ ...editingFlight, from: city })
                              : setNewFlight({ ...newFlight, from: city });
                            setFromSuggestions([]);
                          }}
                        >
                          {city}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="autocomplete form-group">
                  <label>To</label>
                  <input
                    type="text"
                    value={editingFlight ? editingFlight.to : newFlight.to}
                    onChange={(e) => {
                      const value = e.target.value;
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, to: value })
                        : setNewFlight({ ...newFlight, to: value });
                      const suggestions = cities.filter(city => city.toLowerCase().startsWith(value.toLowerCase()));
                      setToSuggestions(suggestions);
                    }}
                  />
                  {toSuggestions.length > 0 && (
                    <ul className="suggestions">
                      {toSuggestions.map((city, index) => (
                        <li
                          key={index}
                          onClick={() => {
                            editingFlight
                              ? setEditingFlight({ ...editingFlight, to: city })
                              : setNewFlight({ ...newFlight, to: city });
                            setToSuggestions([]);
                          }}
                        >
                          {city}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex">
                <div className="form-group">
                  <label>Departure Date</label>
                  <input
                    type="date"
                    value={editingFlight ? editingFlight.departureDate : newFlight.departureDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, departureDate: value })
                        : setNewFlight({ ...newFlight, departureDate: value });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Departure Time</label>
                  <input
                    type="time"
                    value={editingFlight ? editingFlight.departureTime : newFlight.departureTime}
                    onChange={(e) => {
                      const value = e.target.value;
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, departureTime: value })
                        : setNewFlight({ ...newFlight, departureTime: value });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Arrival Time</label>
                  <input
                    type="time"
                    value={editingFlight ? editingFlight.arrivalTime : newFlight.arrivalTime}
                    onChange={(e) => {
                      const value = e.target.value;
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, arrivalTime: value })
                        : setNewFlight({ ...newFlight, arrivalTime: value });
                    }}
                  />
                </div>
              </div>

              <div className="flex">
                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="number"
                    value={editingFlight ? editingFlight.price : newFlight.price}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, price: value })
                        : setNewFlight({ ...newFlight, price: value });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Total Seats</label>
                  <input
                    type="number"
                    value={editingFlight ? editingFlight.totalSeats : newFlight.totalSeats}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, totalSeats: value })
                        : setNewFlight({ ...newFlight, totalSeats: value });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Duration</label>
                  <input
                    type="text"
                    value={editingFlight ? editingFlight.duration : newFlight.duration}
                    onChange={(e) => {
                      const value = e.target.value;
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, duration: value })
                        : setNewFlight({ ...newFlight, duration: value });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editingFlight ? editingFlight.status : newFlight.status}
                    onChange={(e) => {
                      const value = e.target.value;
                      editingFlight
                        ? setEditingFlight({ ...editingFlight, status: value })
                        : setNewFlight({ ...newFlight, status: value });
                    }}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button
                  className="bg-blue"
                  onClick={editingFlight ? handleEditFlight : handleAddFlight}
                >
                  {editingFlight ? 'Update Flight' : 'Add Flight'}
                </button>
                {editingFlight && (
                  <button
                    className="bg-gray"
                    onClick={() => setEditingFlight(null)}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            <div className="admin-tables">
              <div className="flight-management">
                <h3>Flight Management</h3>
                <div className="table-container">
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
                          <td>{flight.airline}</td>
                          <td>{flight.from} → {flight.to}</td>
                          <td>{flight.departureDate}</td>
                          <td>{flight.departureTime} - {flight.arrivalTime}</td>
                          <td>${flight.price}</td>
                          <td>{flight.bookedSeats?.length || 0}/{flight.totalSeats}</td>
                          <td>{flight.status}</td>
                          <td>
                            <div className="flex">
                              <button
                                className="bg-blue"
                                onClick={() => {
                                  setSelectedFlight(flight);
                                  setIsAdmin(false);
                                  setView('seats');
                                }}
                              >
                                View
                              </button>
                              <button
                                className="bg-yellow"
                                onClick={() => setEditingFlight(flight)}
                              >
                                Edit
                              </button>
                              <button
                                className="bg-red"
                                onClick={() => handleDeleteFlight(flight.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="booking-management">
                <h3>Booking Management</h3>
                <div className="table-container">
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
                          <td>{booking.id.substring(0, 8)}</td>
                          <td>
                            {booking.flightId}
                            {booking.returnFlightId && <><br />Return: {booking.returnFlightId}</>}
                          </td>
                          <td>
                            {booking.seats.join(', ')}
                            {booking.returnSeats && <><br />Return: {booking.returnSeats.join(', ')}</>}
                          </td>
                          <td>${booking.totalPrice}</td>
                          <td>{booking.status}</td>
                          <td>
                            {booking.status === 'confirmed' && (
                              <button
                                className="bg-red"
                                onClick={() => handleCancelBooking(booking)}
                              >
                                Cancel
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
          </div>
        )}
      </div>
    </div>
  );
};

export default App;