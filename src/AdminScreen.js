
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';

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

const AdminScreen = () => {
  const navigate = useNavigate();
  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
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
      editingFlight
        ? setEditingFlight({ ...editingFlight, from: value })
        : setNewFlight({ ...newFlight, from: value });
      setFromSuggestions(value ? suggestions : []);
    } else {
      editingFlight
        ? setEditingFlight({ ...editingFlight, to: value })
        : setNewFlight({ ...newFlight, to: value });
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

  // Handle adding new flight
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

  // Handle editing flight
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
          <h1>Flight Booking System - Admin</h1>
          <div className="flex">
            <button
              className="bg-blue"
              onClick={() => navigate('/')}
            >
              User View
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div>
          <h2>Admin Dashboard</h2>

          <div>
            <h3>{editingFlight ? 'Edit Flight' : 'Add New Flight'}</h3>
            <div className="flex">
              <label>
                <span>Airline</span>
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
              </label>
              <label className="autocomplete">
                <span>From</span>
                <input
                  type="text"
                  value={editingFlight ? editingFlight.from : newFlight.from}
                  onChange={(e) => handleCityInput(e.target.value, 'from')}
                />
                {fromSuggestions.length > 0 && (
                  <ul>
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
              </label>
              <label className="autocomplete">
                <span>To</span>
                <input
                  type="text"
                  value={editingFlight ? editingFlight.to : newFlight.to}
                  onChange={(e) => handleCityInput(e.target.value, 'to')}
                />
                {toSuggestions.length > 0 && (
                  <ul>
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
              </label>
            </div>

            <div className="flex">
              <label>
                <span>Departure Date</span>
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
              </label>
              <label>
                <span>Departure Time</span>
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
              </label>
              <label>
                <span>Arrival Time</span>
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
              </label>
            </div>

            <div className="flex">
              <label>
                <span>Price</span>
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
              </label>
              <label>
                <span>Total Seats</span>
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
              </label>
              <label>
                <span>Duration</span>
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
              </label>
              <label>
                <span>Status</span>
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
              </label>
            </div>

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

          <div>
            <h3>Flight Management</h3>
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
                    <td className="flex">
                      <button
                        className="bg-blue"
                        onClick={() => navigate('/')}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3>Booking Management</h3>
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Flight</th>
                  <th>Seats</th>
                  <th>Passenger Types</th>
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
                    <td>{booking.passengers.map(p => p.type).join(', ')}</td>
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
  );
};

export default AdminScreen;
