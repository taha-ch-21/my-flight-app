

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

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
  'New York', 'London', 'Paris', 'Tokyo', 'Sydney', 'Dubai', 'Singapore',
  'Los Angeles', 'Chicago', 'Hong Kong', 'Miami', 'Toronto', 'Mumbai'
];

const UserScreen = () => {
  const navigate = useNavigate();
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

  // Generate seat map
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
      setError('Failed to fetch flights. Please try again.');
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
      setError('Failed to fetch bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle flight search
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
    if (passengerDetails.some(p => !p.name || !p.passport || !p.type)) {
      setError('Please fill in all passenger details, including seat type.');
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

  // Initialize passenger details
  useEffect(() => {
    if (selectedFlight && searchParams.passengers > 0) {
      setPassengerDetails(
        Array(searchParams.passengers).fill().map(() => ({ name: '', passport: '', type: 'Adult' }))
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

  return (
    <div>
      <header>
        <div className="container flex">
          <h1>Flight Booking System</h1>
          <div className="flex">
            <button
              className="bg-blue"
              onClick={() => setView('search')}
            >
              Search Flights
            </button>
            <button
              className="bg-blue"
              onClick={() => setView('bookings')}
            >
              My Bookings
            </button>
            <button
              className="bg-blue"
              onClick={() => navigate('/admin')}
            >
              Admin Panel
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {view === 'search' ? (
          <div>
            <h2>Search Flights</h2>
            <form onSubmit={handleSearch}>
              <div>
                <div>
                  <label>Trip Type</label>
                  <select
                    value={searchParams.tripType}
                    onChange={(e) => setSearchParams({ ...searchParams, tripType: e.target.value })}
                  >
                    <option value="one-way">One-way</option>
                    <option value="round-trip">Round-trip</option>
                  </select>
                </div>
              </div>

              <div className="flex">
                <div className="autocomplete">
                  <label>From</label>
                  <input
                    type="text"
                    value={searchParams.from}
                    onChange={(e) => handleCityInput(e.target.value, 'from')}
                    required
                  />
                  {fromSuggestions.length > 0 && (
                    <ul>
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
                <div className="autocomplete">
                  <label>To</label>
                  <input
                    type="text"
                    value={searchParams.to}
                    onChange={(e) => handleCityInput(e.target.value, 'to')}
                    required
                  />
                  {toSuggestions.length > 0 && (
                    <ul>
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
                <div>
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
                  <div>
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
                <div>
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
                <div>
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
                <div className="flex">
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
          <div>
            <h2>Available Flights</h2>
            <button
              className="bg-gray"
              onClick={() => setView('search')}
            >
              Back to Search
            </button>
            {flights.length === 0 ? (
              <p>No flights found. Try different search criteria.</p>
            ) : (
              <div className="flex">
                {flights.map(flight => (
                  <div key={flight.id} className="flight-card">
                    <div className="flex">
                      <h3>{flight.airline}</h3>
                      <span>${flight.price}</span>
                    </div>
                    <div className="flex">
                      <div>
                        <p>{flight.departureTime}</p>
                        <p>{flight.from}</p>
                      </div>
                      <div>
                        <p>{flight.duration}</p>
                        <div></div>
                        <p>{flight.isDirect ? 'Direct' : 'Non-direct'}</p>
                      </div>
                      <div>
                        <p>{flight.arrivalTime}</p>
                        <p>{flight.to}</p>
                      </div>
                    </div>
                    <p>Status: {flight.status}</p>
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
          <div>
            <h2>
              Select Seats for {selectedFlight.airline} ({selectedFlight.from} to {selectedFlight.to})
            </h2>
            <button
              className="bg-gray"
              onClick={() => setView('flights')}
            >
              Back to Flights
            </button>

            <div>
              <h3>Seat Map</h3>
              <div className="seat-map">
                <div></div>
                {['A', 'B', 'C', '', 'D', 'E', 'F'].map((label, index) => (
                  <div key={index}>{label}</div>
                ))}
                {Array(10).fill().map((_, rowIndex) => (
                  <div key={rowIndex} className="flex">
                    <div>{rowIndex + 1}</div>
                    {selectedFlight.seatMap
                      .slice(rowIndex * 6, (rowIndex + 1) * 6)
                      .map(seat => (
                        <button
                          key={seat}
                          className={
                            selectedFlight.bookedSeats.includes(seat)
                              ? 'booked'
                              : selectedSeats.includes(seat)
                              ? 'selected'
                              : 'available'
                          }
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
              <div>
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
              <div>
                <h3>
                  Return Flight Seat Map ({selectedReturnFlight.from} to {selectedReturnFlight.to})
                </h3>
                <div className="seat-map">
                  <div></div>
                  {['A', 'B', 'C', '', 'D', 'E', 'F'].map((label, index) => (
                    <div key={index}>{label}</div>
                  ))}
                  {Array(10).fill().map((_, rowIndex) => (
                    <div key={rowIndex} className="flex">
                      <div>{rowIndex + 1}</div>
                      {selectedReturnFlight.seatMap
                        .slice(rowIndex * 6, (rowIndex + 1) * 6)
                        .map(seat => (
                          <button
                            key={seat}
                            className={
                              selectedReturnFlight.bookedSeats.includes(seat)
                                ? 'booked'
                                : selectedReturnSeats.includes(seat)
                                ? 'selected'
                                : 'available'
                            }
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

            <div>
              <h3>Passenger Information</h3>
              {passengerDetails.map((passenger, index) => (
                <div key={index}>
                  <h4>Passenger {index + 1}</h4>
                  <div className="flex">
                    <label>
                      <span>Full Name</span>
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
                    </label>
                    <label>
                      <span>Passport</span>
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
                    </label>
                    <label>
                      <span>Passenger Type</span>
                      <select
                        value={passenger.type}
                        onChange={(e) => {
                          const updated = [...passengerDetails];
                          updated[index].type = e.target.value;
                          setPassengerDetails(updated);
                        }}
                        required
                      >
                        <option value="Adult">Adult</option>
                        <option value="Child">Child</option>
                        <option value="Infant">Infant</option>
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3>Booking Summary</h3>
              <p><strong>Flight:</strong> {selectedFlight.from} to {selectedFlight.to}</p>
              <p><strong>Date:</strong> {selectedFlight.departureDate}</p>
              <p><strong>Selected Seats:</strong> {selectedSeats.join(', ') || 'None'}</p>
              {selectedReturnFlight && (
                <>
                  <p><strong>Return Flight:</strong> {selectedReturnFlight.from} to {selectedReturnFlight.to}</p>
                  <p><strong>Return Date:</strong> {selectedReturnFlight.departureDate}</p>
                  <p><strong>Return Seats:</strong> {selectedReturnSeats.join(', ') || 'None'}</p>
                </>
              )}
              <p><strong>Passenger Types:</strong> {passengerDetails.map(p => p.type).join(', ')}</p>
              <p><strong>Total Price:</strong> $
                {(selectedFlight.price * searchParams.passengers +
                  (selectedReturnFlight ? selectedReturnFlight.price * searchParams.passengers : 0)).toFixed(2)}
              </p>
              <button
                className="bg-blue"
                onClick={handleBooking}
                disabled={
                  selectedSeats.length !== searchParams.passengers ||
                  (searchParams.tripType === 'round-trip' && selectedReturnSeats.length !== searchParams.passengers) ||
                  passengerDetails.some(p => !p.name || !p.passport || !p.type)
                }
              >
                Confirm Booking
              </button>
            </div>
          </div>
        ) : view === 'bookings' ? (
          <div>
            <h2>My Bookings</h2>
            <button
              className="bg-gray"
              onClick={() => setView('search')}
            >
              Back to Search
            </button>
            {bookings.length === 0 ? (
              <p>No bookings found.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Flight</th>
                    <th>Seats</th>
                    <th>Passenger Types</th>
                    <th>Total</th>
                    <th>Status</th>
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
                      <td>{booking.passengers.map(p => p.type).join(', ')}</td>
                      <td>${booking.totalPrice}</td>
                      <td>{booking.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : view === 'confirmation' ? (
          <div>
            <h2>Booking Confirmed!</h2>
            <p>Your booking has been successfully placed.</p>
            <p><strong>Booking Reference:</strong> {bookingReference}</p>
            <button
              className="bg-blue"
              onClick={() => setView('search')}
            >
              Back to Search
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default UserScreen;
