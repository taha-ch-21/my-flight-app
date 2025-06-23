import React, { useState } from 'react';
import { FiUser, FiLock } from 'react-icons/fi';
import styles from './Auth.module.css';

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [credentials, setCredentials] = useState({
	email: '',
	password: '',
	name: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
	setCredentials({
	  ...credentials,
	  [e.target.name]: e.target.value
	});
  };

  const handleSubmit = (e) => {
	e.preventDefault();
	setError('');

	// Simple validation
	if (!credentials.email || !credentials.password) {
	  setError('Email and password are required');
	  return;
	}

	if (!isLogin && !credentials.name) {
	  setError('Name is required for registration');
	  return;
	}

	// Mock authentication - in a real app, you would call an API here
	if (credentials.email === 'aniquaiqbal@gmail.com' && credentials.password === 'dildilpakistan123') {
	  onLogin({ email: credentials.email, name: 'Admin', isAdmin: true });
	} else if (credentials.email === 'user@skyjourney.com' && credentials.password === 'user123') {
	  onLogin({ email: credentials.email, name: 'User', isAdmin: false });
	} else {
	  // Mock registration for new users
	  if (!isLogin) {
		onLogin({ email: credentials.email, name: credentials.name, isAdmin: false });
	  } else {
		setError('Invalid credentials');
	  }
	}
  };

  return (
<div className={styles.container}>
  <div className={styles.card}>
	<h2 className={styles.title}>{isLogin ? 'Sign In' : 'Create Account'}</h2>

	{error && (
	  <div className={styles.errorBox}>
		<p>{error}</p>
	  </div>
	)}

	<form onSubmit={handleSubmit} className={styles.form}>
	  {!isLogin && (
		<div className={styles.inputGroup}>
		  <label className={styles.label}>Full Name</label>
		  <div className={styles.inputWrapper}>
			<input
			  type="text"
			  name="name"
			  value={credentials.name}
			  onChange={handleChange}
			  className={styles.input}
			  placeholder="John Doe"
			/>
			<FiUser className={styles.icon} />
		  </div>
		</div>
	  )}

	  <div className={styles.inputGroup}>
		<label className={styles.label}>Email</label>
		<div className={styles.inputWrapper}>
		  <input
			type="email"
			name="email"
			value={credentials.email}
			onChange={handleChange}
			className={styles.input}
			placeholder="your@email.com"
		  />
		  <FiUser className={styles.icon} />
		</div>
	  </div>

	  <div className={styles.inputGroup}>
		<label className={styles.label}>Password</label>
		<div className={styles.inputWrapper}>
		  <input
			type="password"
			name="password"
			value={credentials.password}
			onChange={handleChange}
			className={styles.input}
			placeholder="••••••••"
		  />
		  <FiLock className={styles.icon} />
		</div>
	  </div>

	  <button type="submit" className={styles.button}>
		{isLogin ? 'Sign In' : 'Register'}
	  </button>

	  <div className={styles.toggle}>
		<button
		  type="button"
		  onClick={() => setIsLogin(!isLogin)}
		  className={styles.toggleButton}
		>
		  {isLogin ? 'Need an account? Register' : 'Already have an account? Sign In'}
		</button>
	  </div>
	</form>
  </div>
</div>

  );
};

export default Auth;