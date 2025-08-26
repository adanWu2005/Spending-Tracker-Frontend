import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api, { setTokens } from '../api'
import './Auth.css'

const EmailVerification = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [verificationCode, setVerificationCode] = useState('')
  const [userData, setUserData] = useState(null)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    // Get user data from location state (passed from Register component)
    if (location.state?.userData) {
      setUserData(location.state.userData)
    } else {
      // If no user data, redirect back to register
      navigate('/register')
    }
  }, [location.state, navigate])

  useEffect(() => {
    let timer
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6) // Only allow digits, max 6
    setVerificationCode(value)
    if (errors.code) {
      setErrors({ ...errors, code: '' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!verificationCode || verificationCode.length !== 6) {
      setErrors({ code: 'Please enter a 6-digit verification code' })
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const response = await api.post('api/verify-email/', {
        user_id: userData.user_id,
        code: verificationCode
      })

      // Set tokens and redirect to home
      const { access, refresh } = response.data
      setTokens(access, refresh)
      navigate('/')
    } catch (error) {
      console.log('Verification error:', error.response?.data || error.message)
      if (error.response?.data?.error) {
        setErrors({ code: error.response.data.error })
      } else {
        setErrors({ code: 'Verification failed. Please try again.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (countdown > 0) return

    setIsLoading(true)
    setErrors({})

    try {
      await api.post('api/resend-verification/', {
        user_id: userData.user_id
      })
      
      setCountdown(60) // 60 second cooldown
      setErrors({ success: 'Verification code sent successfully!' })
    } catch (error) {
      console.log('Resend error:', error.response?.data || error.message)
      if (error.response?.data?.error) {
        setErrors({ code: error.response.data.error })
      } else {
        setErrors({ code: 'Failed to resend code. Please try again.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToRegistration = async () => {
    try {
      // Delete the unverified user
      await api.post('api/delete-unverified-user/', {
        user_id: userData.user_id
      })
      
      // Navigate back to registration
      navigate('/register')
    } catch (error) {
      console.log('Delete user error:', error.response?.data || error.message)
      // Even if deletion fails, still navigate back to registration
      navigate('/register')
    }
  }

  if (!userData) {
    return <div>Loading...</div>
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="auth-title">Verify Your Email</h2>
        <p className="auth-subtitle">
          We've sent a 6-digit verification code to <strong>{userData.email}</strong>
        </p>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="verificationCode">
              Verification Code
            </label>
            <input
              type="text"
              id="verificationCode"
              name="verificationCode"
              className={`form-input ${errors.code ? 'error' : ''}`}
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={handleCodeChange}
              maxLength={6}
              required
            />
            {errors.code && <span className="error-message">{errors.code}</span>}
            {errors.success && <span className="success-message">{errors.success}</span>}
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading || verificationCode.length !== 6}
          >
            {isLoading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="resend-section">
          <p>Didn't receive the code?</p>
          <button
            type="button"
            className="resend-button"
            onClick={handleResendCode}
            disabled={countdown > 0 || isLoading}
          >
            {countdown > 0 
              ? `Resend in ${countdown}s` 
              : 'Resend Code'
            }
          </button>
        </div>

        <div className="auth-link">
          <button 
            type="button" 
            className="link-button"
            onClick={handleBackToRegistration}
          >
            Back to Registration
          </button>
        </div>
      </div>
    </div>
  )
}

export default EmailVerification
