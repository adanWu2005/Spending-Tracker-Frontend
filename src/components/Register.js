import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, {setTokens} from '../api'
import './Auth.css'

const Register = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    dataConsent: false
  })
  const [errors, setErrors] = useState({})
  const [showTerms, setShowTerms] = useState(false)

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({
      ...formData,
      [e.target.name]: value
    })
  }

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.dataConsent) {
      newErrors.dataConsent = 'You must consent to data collection and processing to use this application';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit =  async (e) => {
    e.preventDefault()

    if(!validateForm()){
        return;
    }

    try {   
        const response = await api.post('api/register/', {
            username : formData.username,
            email: formData.email,
            password : formData.password,
            data_consent: formData.dataConsent
        })

        // Redirect to email verification page with user data
        navigate('/verify-email', { 
            state: { 
                userData: {
                    user_id: response.data.user_id,
                    email: response.data.email
                }
            }
        });
    } catch (error) {
        console.log('Registration error:', error.response?.data || error.message)
        if (error.response?.data) {
            // Display specific error messages
            const errorData = error.response.data
            const newErrors = {}
            
            if (errorData.username) {
                newErrors.username = Array.isArray(errorData.username) ? errorData.username[0] : errorData.username
            }
            if (errorData.email) {
                newErrors.email = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email
            }
            if (errorData.password) {
                newErrors.password = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password
            }
            if (errorData.error) {
                newErrors.dataConsent = errorData.error
            }
            
            setErrors(newErrors)
        }
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="auth-title">Register</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              className={`form-input ${errors.username ? 'error' : ''}`}
              placeholder="Enter your username"
              value={formData.username}
              onChange={handleChange}
              required
            />
            {errors.username && <span className="error-message">{errors.username}</span>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>
          
          <div className="form-group">
            <div className="consent-section">
              <label className="consent-label">
                <input
                  type="checkbox"
                  name="dataConsent"
                  checked={formData.dataConsent}
                  onChange={handleChange}
                  className="consent-checkbox"
                />
                <span className="consent-text">
                  I consent to the collection, processing, and storage of my data for the purpose of personal finance management and spending tracking.
                </span>
              </label>
              <button 
                type="button" 
                className="terms-link"
                onClick={() => setShowTerms(!showTerms)}
              >
                View Terms of Service & Privacy Policy
              </button>
              {errors.dataConsent && <span className="error-message">{errors.dataConsent}</span>}
            </div>
          </div>
          
          {showTerms && (
            <div className="terms-modal">
              <div className="terms-content">
                <h3>Terms of Service & Privacy Policy</h3>
                <div className="terms-text">
                  <h4>Data Collection and Use</h4>
                  <p>By using this application, you consent to:</p>
                  <ul>
                    <li>Collection of your bank account and transaction data through Plaid</li>
                    <li>Processing of your financial information for spending analysis and budgeting</li>
                    <li>Storage of your data in encrypted format on our secure servers</li>
                    <li>Sharing of necessary data with Plaid for bank account connectivity</li>
                  </ul>
                  
                  <h4>Data Security</h4>
                  <p>We implement industry-standard security measures to protect your data:</p>
                  <ul>
                    <li>All data is encrypted in transit using TLS 1.2+</li>
                    <li>All data is encrypted at rest in our database</li>
                    <li>We use secure authentication and access controls</li>
                    <li>We do not share your data with third parties except as required for service functionality</li>
                  </ul>
                  
                  <h4>Your Rights</h4>
                  <p>You have the right to:</p>
                  <ul>
                    <li>Access your personal data</li>
                    <li>Request deletion of your data</li>
                    <li>Withdraw consent at any time</li>
                    <li>Contact us with privacy concerns</li>
                  </ul>
                </div>
                <button 
                  type="button" 
                  className="close-terms"
                  onClick={() => setShowTerms(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
          
          <button type="submit" className="auth-button">
            Register
          </button>
        </form>
        <div className="auth-link">
          Already have an account? <a href="/login">Login here</a>
        </div>
      </div>
    </div>
  )
}

export default Register