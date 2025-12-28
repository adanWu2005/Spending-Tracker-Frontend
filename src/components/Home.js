import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { usePlaidLink } from 'react-plaid-link'
import api from '../api'
import './Home.css'

// Separate component to handle Plaid Link initialization
const PlaidLinkHandler = ({ linkToken, onSuccess, onExit, onLoad, children }) => {
  console.log('PlaidLinkHandler - linkToken:', !!linkToken, 'token value:', linkToken)
  
  const config = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit,
    onLoad,
  })
  
  console.log('PlaidLinkHandler - config:', config)
  
  return children(config)
}

const Home = () => {
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [spendingSummary, setSpendingSummary] = useState({})
  const [totalNet, setTotalNet] = useState(null)
  const [loading, setLoading] = useState(false)
  const [linkToken, setLinkToken] = useState(null)
  const [transactionFilters, setTransactionFilters] = useState({
    startDate: '',
    endDate: '',
    accountId: '',
    transactionType: '',
    keyword: '',
    category: ''
  })
  const navigate = useNavigate()
  const shouldOpenRef = useRef(false)

  // Define handlePlaidSuccess before using it in usePlaidLink
  const handlePlaidSuccess = useCallback(async (publicToken, metadata) => {
    try {
      console.log('Plaid success callback triggered with public token:', publicToken)
      setLoading(true)
      await api.post('api/plaid/exchange-token/', { public_token: publicToken })
      console.log('Token exchange successful, refreshing data...')
      setLinkToken(null)
      
      // Refresh all data after successful connection
      await fetchUserData()
      await fetchAccounts()
      await fetchTransactions()
      await fetchSpendingSummary()
      
      console.log('Data refresh completed')
    } catch (error) {
      console.error('Error exchanging token:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debug Plaid Link state
  useEffect(() => {
    console.log('Plaid Link ready state changed:', !!linkToken)
    if (linkToken) {
      console.log('Link token is set, PlaidLinkHandler should initialize')
    } else {
      console.log('No link token, PlaidLinkHandler will not initialize')
    }
  }, [linkToken])

  // Auto-open Plaid Link when token is ready
  useEffect(() => {
    if (linkToken) {
      // The PlaidLinkHandler will handle opening when ready
      console.log('Link token set, Plaid Link will open when ready')
    }
  }, [linkToken])

  useEffect(() => {
    fetchUserData()
    fetchAccounts()
    fetchTransactions()
    fetchSpendingSummary()
  }, [])

  // Refetch transactions when filters change
  useEffect(() => {
    fetchTransactions()
  }, [transactionFilters])



  // Refresh data after successful Plaid connection
  useEffect(() => {
    if (user?.plaid_access_token) {
      fetchAccounts()
      fetchTransactions()
      fetchSpendingSummary()
    }
  }, [user?.plaid_access_token])

  // Cleanup link token on unmount
  useEffect(() => {
    return () => {
      setLinkToken(null)
    }
  }, [])

  const fetchUserData = async () => {
    try {
      console.log('Fetching user data...')
      const response = await api.get('api/profile/')
      console.log('User data response:', response.data)
      setUser(response.data)
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const fetchAccounts = async () => {
    try {
      console.log('Fetching accounts...')
      const response = await api.get('api/accounts/')
      console.log('Accounts response:', response.data)
      console.log('Accounts response type:', typeof response.data)
      console.log('Accounts response length:', Array.isArray(response.data) ? response.data.length : 'Not an array')
      console.log('Accounts response keys:', Object.keys(response.data || {}))
      
      // Convert object to array if needed
      const accountsData = Array.isArray(response.data) ? response.data : Object.values(response.data)
      console.log('Processed accounts data:', accountsData)
      setAccounts(accountsData)
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams()
      if (transactionFilters.startDate) {
        params.append('start_date', transactionFilters.startDate)
      }
      if (transactionFilters.endDate) {
        params.append('end_date', transactionFilters.endDate)
      }
      if (transactionFilters.accountId) {
        params.append('account_id', transactionFilters.accountId)
      }
      if (transactionFilters.transactionType) {
        params.append('transaction_type', transactionFilters.transactionType)
      }
      if (transactionFilters.keyword) {
        params.append('keyword', transactionFilters.keyword)
      }
      if (transactionFilters.category) {
        params.append('category', transactionFilters.category)
      }
      
      const url = `api/transactions/${params.toString() ? '?' + params.toString() : ''}`
      const response = await api.get(url)
      setTransactions(response.data)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const fetchSpendingSummary = async () => {
    // ALWAYS LOG - This will help us see if the function is even being called
    console.log('========================================')
    console.log('🔄 FETCHING SPENDING SUMMARY - FUNCTION CALLED')
    console.log('========================================')
    
    try {
      console.log('📡 Making API request to: api/spending-summary/?debug=true')
      const response = await api.get('api/spending-summary/?debug=true')
      
      console.log('✅ API Response received!')
      console.log('📊 Full Response Data:', JSON.stringify(response.data, null, 2))
      
      // Handle both regular response and debug response
      if (response.data && response.data.summary) {
        // Debug mode response - extract summary object
        console.log('📦 Debug mode response detected')
        setSpendingSummary(response.data.summary)
        // Store total_net for display
        if (response.data.total_net !== undefined) {
          setTotalNet(response.data.total_net)
        } else {
          setTotalNet(null)
        }
        console.log('📊 Spending Summary Debug Info:', response.data.debug)
        
        if (response.data.debug) {
          console.log('🔑 OpenAI Key Configured:', response.data.debug.openai_key_configured)
          console.log('📈 AI Categorized:', response.data.debug.ai_categorized_count, 'out of', response.data.debug.total_transactions)
          console.log('🔧 Transactions Fixed:', response.data.debug.transactions_fixed)
          
          if (response.data.debug.openai_key_configured) {
            console.log('✅✅✅ OpenAI API key IS configured ✅✅✅')
            console.log(`✅ ${response.data.debug.ai_categorized_count} out of ${response.data.debug.total_transactions} transactions categorized by AI`)
          } else {
            console.error('❌❌❌ OpenAI API key is NOT configured ❌❌❌')
            console.error('💡 Make sure OPENAI_API_KEY is set in backend/backend/.env file')
            console.error('💡 Restart your Django server after adding the key')
          }
        }
      } else if (response.data) {
        // Regular response - check if it's already the summary object
        console.log('📦 Regular mode response detected')
        const summaryData = {}
        for (const [key, value] of Object.entries(response.data)) {
          // Only include entries that look like categories (have numeric values)
          if (typeof value === 'number' && !isNaN(value)) {
            summaryData[key] = value
          }
        }
        setSpendingSummary(summaryData)
        setTotalNet(null) // No total net in regular mode
        console.log('📊 Spending Summary (regular mode):', summaryData)
      } else {
        console.error('⚠️ No data received from spending summary endpoint')
        setSpendingSummary({})
      }
    } catch (error) {
      console.error('========================================')
      console.error('❌ ERROR FETCHING SPENDING SUMMARY')
      console.error('========================================')
      console.error('Error object:', error)
      console.error('Error message:', error.message)
      console.error('Error response:', error.response)
      console.error('Error response data:', error.response?.data)
      setSpendingSummary({})
    }
    
    console.log('========================================')
    console.log('✅ FETCH SPENDING SUMMARY COMPLETE')
    console.log('========================================')
  }


  const createLinkToken = async () => {
    // Prevent multiple requests
    if (loading || linkToken) {
      console.log('Link token request already in progress or token exists')
      return
    }
    
    try {
      setLoading(true)
      console.log('Creating link token...')
      const response = await api.post('api/plaid/create-link-token/')
      console.log('Link token response:', response.data)
      console.log('Link token value:', response.data.link_token)
      console.log('Link token type:', typeof response.data.link_token)
      console.log('Link token length:', response.data.link_token ? response.data.link_token.length : 0)
      
      if (response.data.link_token) {
        setLinkToken(response.data.link_token)
        shouldOpenRef.current = true
        console.log('Link token set successfully, shouldOpen set to true')
      } else {
        console.error('No link token in response')
      }
      // The Plaid Link will open automatically when linkToken is set
    } catch (error) {
      console.error('Error creating link token:', error)
      console.error('Error details:', error.response?.data)
    } finally {
      setLoading(false)
    }
  }

  const syncTransactions = async () => {
    try {
      setLoading(true)
      const response = await api.post('api/plaid/sync-transactions/')
      console.log('Sync response:', response.data)
      // Refresh accounts too to ensure balances and any cleanup are reflected
      await fetchAccounts()
      await fetchTransactions()
      // Fetch spending summary - this will automatically categorize new transactions
      await fetchSpendingSummary()
    } catch (error) {
      console.error('Error syncing transactions:', error)
      console.error('Error response data:', error.response?.data)
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred'
      console.error('Error message:', errorMessage)
      
      // Check if user needs to reconnect (expired token)
      if (error.response?.data?.requires_reauth || error.response?.data?.error_code === 'ITEM_LOGIN_REQUIRED') {
        alert('Your bank account connection has expired. Please reconnect your bank account by clicking "Connect Bank Account".')
      } else {
        alert(`Failed to sync transactions: ${errorMessage}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  const handleFilterChange = (filterType, value) => {
    setTransactionFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  const clearFilters = () => {
    setTransactionFilters({
      startDate: '',
      endDate: '',
      accountId: '',
      transactionType: '',
      keyword: '',
      category: ''
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  console.log('Home component render - linkToken:', !!linkToken, 'linkToken value:', linkToken)
  
  // Only render PlaidLinkHandler when we have a link token
  if (linkToken) {
    return (
      <PlaidLinkHandler
        linkToken={linkToken}
        onSuccess={handlePlaidSuccess}
        onExit={() => {
          console.log('Plaid Link exited')
          setLinkToken(null)
        }}
        onLoad={() => console.log('Plaid Link loaded successfully')}
      >
        {({ open, ready }) => {
          // Debug Plaid Link state in render prop
          console.log('PlaidLinkHandler render - ready:', ready, 'linkToken:', !!linkToken, 'shouldOpen:', shouldOpenRef.current)
          
          // Auto-open Plaid Link when token is ready
          if (linkToken && ready && shouldOpenRef.current) {
            console.log('Auto-opening Plaid Link')
            shouldOpenRef.current = false
            setTimeout(() => open(), 0)
          }

          return (
            <div className="home-container">
          <header className="home-header">
            <h1>Spending Tracker</h1>
            <div className="header-actions">
              {user?.plaid_access_token ? (
                <button onClick={syncTransactions} disabled={loading} className="sync-button">
                  {loading ? 'Syncing...' : 'Sync Transactions'}
                </button>
              ) : (
                <button 
                  onClick={() => {
                    console.log('Button clicked, loading:', loading, 'ready:', ready, 'linkToken:', !!linkToken)
                    createLinkToken()
                  }} 
                  disabled={loading || !ready} 
                  className="connect-button"
                  style={{ opacity: (loading || !ready) ? 0.5 : 1 }}
                >
                  {loading ? 'Connecting...' : !ready ? 'Initializing...' : 'Connect Bank Account'}
                </button>
              )}

              <button onClick={handleLogout} className="logout-button">Logout</button>
            </div>
          </header>



      <div className="dashboard-grid">
        {/* Accounts Section */}
        <div className="dashboard-section">
          <h2>Bank Accounts</h2>
          {accounts.length === 0 ? (
            <p className="no-data">No bank accounts connected. Connect your first account to get started.</p>
          ) : (
            <div className="accounts-grid">
              {accounts.map(account => (
                <div key={account.id} className="account-card">
                  <h3>{account.name}</h3>
                  <p className="account-type">{account.type} • {account.institution_name}</p>
                  <p className="account-balance">{formatCurrency(account.balance)}</p>
                  <p className="account-mask">****{account.mask}</p>
                </div>
              ))}
            </div>
          )}
        </div>

          {/* Spending Summary */}
          <div className="dashboard-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2>Spending Summary (Last 30 Days)</h2>
              <button 
                onClick={async () => {
                  console.log('🧪 TEST BUTTON CLICKED - Testing OpenAI...')
                  try {
                    const response = await api.get('api/test-openai-key/')
                    console.log('🧪 OpenAI Test Result:', response.data)
                    alert(`OpenAI Key Status: ${response.data.openai_key_found ? 'FOUND ✅' : 'NOT FOUND ❌'}\nTest Successful: ${response.data.openai_test_successful ? 'YES ✅' : 'NO ❌'}`)
                  } catch (error) {
                    console.error('🧪 OpenAI Test Error:', error)
                    alert('Error testing OpenAI: ' + (error.response?.data?.error || error.message))
                  }
                }}
                className="sync-button"
                style={{ fontSize: '12px', padding: '5px 10px' }}
              >
                Test OpenAI Key
              </button>
            </div>
            {Object.keys(spendingSummary).length === 0 ? (
              <p className="no-data">No spending data available.</p>
            ) : (
              <div className="spending-summary">
                {/* Show total net at the top */}
                {totalNet !== null && (
                  <div style={{ 
                    padding: '10px', 
                    marginBottom: '15px', 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: '5px',
                    border: '1px solid #ddd',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    <span>Total Net: </span>
                    <span style={{ color: totalNet >= 0 ? '#d32f2f' : '#2e7d32' }}>
                      {formatCurrency(totalNet)}
                    </span>
                  </div>
                )}
                {Object.entries(spendingSummary).map(([category, amount]) => (
                  <div key={category} className="spending-item">
                    <span className="category-name">{category}</span>
                    <span className="category-amount" style={{ color: amount >= 0 ? '#d32f2f' : '#2e7d32' }}>
                      {formatCurrency(amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        {/* Recent Transactions */}
        <div className="dashboard-section full-width">
          <div className="transactions-header">
            <h2>Recent Transactions</h2>
            <div className="transaction-filters">
              <div className="filter-group">
                <label htmlFor="start-date">Start Date:</label>
                <input
                  type="date"
                  id="start-date"
                  value={transactionFilters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label htmlFor="end-date">End Date:</label>
                <input
                  type="date"
                  id="end-date"
                  value={transactionFilters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label htmlFor="account-filter">Account:</label>
                <select
                  id="account-filter"
                  value={transactionFilters.accountId}
                  onChange={(e) => handleFilterChange('accountId', e.target.value)}
                  className="filter-input"
                >
                  <option value="">All Accounts</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {account.institution_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="transaction-type-filter-1">Type:</label>
                <select
                  id="transaction-type-filter-1"
                  value={transactionFilters.transactionType}
                  onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                  className="filter-input"
                >
                  <option value="">All Transactions</option>
                  <option value="income">Income</option>
                  <option value="expense">Expenses</option>
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="keyword-search-1">Search:</label>
                <input
                  type="text"
                  id="keyword-search-1"
                  placeholder="Search transaction names..."
                  value={transactionFilters.keyword}
                  onChange={(e) => handleFilterChange('keyword', e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label htmlFor="category-filter-1">Category:</label>
                <select
                  id="category-filter-1"
                  value={transactionFilters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="filter-input"
                >
                  <option value="">All Categories</option>
                  {Object.keys(spendingSummary).sort().map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={clearFilters} className="clear-filters-btn">
                Clear Filters
              </button>
            </div>
          </div>
          {transactions.length === 0 ? (
            <p className="no-data">No transactions found. Sync your bank account to see transactions.</p>
          ) : (
            <div className="transactions-list">
              {transactions.slice(0, 50).map(transaction => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-info">
                    <h4>{transaction.name}</h4>
                    <p className="transaction-date">{formatDate(transaction.date)}</p>
                    <p className="transaction-account">{transaction.account_name}</p>
                  </div>
                  <div className="transaction-amount">
                    <span className={`amount ${transaction.amount > 0 ? 'expense' : 'income'}`}>
                      {formatCurrency(transaction.amount)}
                    </span>
                    {transaction.primary_category_name && (
                      <span className="transaction-category">{transaction.primary_category_name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
                </div>
        )
      }}
    </PlaidLinkHandler>
    )
  } else {
    // Render without PlaidLinkHandler when no link token
    return (
      <div className="home-container">
        <header className="home-header">
          <h1>Spending Tracker</h1>
          <div className="header-actions">
            {user?.plaid_access_token ? (
              <button onClick={syncTransactions} disabled={loading} className="sync-button">
                {loading ? 'Syncing...' : 'Sync Transactions'}
              </button>
            ) : (
              <button 
                onClick={() => {
                  console.log('Button clicked, loading:', loading, 'linkToken:', !!linkToken)
                  createLinkToken()
                }} 
                disabled={loading} 
                className="connect-button"
                style={{ opacity: loading ? 0.5 : 1 }}
              >
                {loading ? 'Connecting...' : 'Connect Bank Account'}
              </button>
            )}

            <button onClick={handleLogout} className="logout-button">Logout</button>
          </div>
        </header>

        <div className="dashboard-grid">
          {/* Accounts Section */}
          <div className="dashboard-section">
            <h2>Bank Accounts</h2>
            {accounts.length === 0 ? (
              <p className="no-data">No bank accounts connected. Connect your first account to get started.</p>
            ) : (
              <div className="accounts-grid">
                {accounts.map(account => (
                  <div key={account.id} className="account-card">
                    <h3>{account.name}</h3>
                    <p className="account-type">{account.type} • {account.institution_name}</p>
                    <p className="account-balance">{formatCurrency(account.balance)}</p>
                    <p className="account-mask">****{account.mask}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Spending Summary */}
          <div className="dashboard-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2>Spending Summary (Last 30 Days)</h2>
              <button 
                onClick={async () => {
                  console.log('🧪 TEST BUTTON CLICKED - Testing OpenAI...')
                  try {
                    const response = await api.get('api/test-openai-key/')
                    console.log('🧪 OpenAI Test Result:', response.data)
                    alert(`OpenAI Key Status: ${response.data.openai_key_found ? 'FOUND ✅' : 'NOT FOUND ❌'}\nTest Successful: ${response.data.openai_test_successful ? 'YES ✅' : 'NO ❌'}`)
                  } catch (error) {
                    console.error('🧪 OpenAI Test Error:', error)
                    alert('Error testing OpenAI: ' + (error.response?.data?.error || error.message))
                  }
                }}
                className="sync-button"
                style={{ fontSize: '12px', padding: '5px 10px' }}
              >
                Test OpenAI Key
              </button>
            </div>
            {Object.keys(spendingSummary).length === 0 ? (
              <p className="no-data">No spending data available.</p>
            ) : (
              <div className="spending-summary">
                {/* Show total net at the top */}
                {totalNet !== null && (
                  <div style={{ 
                    padding: '10px', 
                    marginBottom: '15px', 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: '5px',
                    border: '1px solid #ddd',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    <span>Total Net: </span>
                    <span style={{ color: totalNet >= 0 ? '#d32f2f' : '#2e7d32' }}>
                      {formatCurrency(totalNet)}
                    </span>
                  </div>
                )}
                {Object.entries(spendingSummary).map(([category, amount]) => (
                  <div key={category} className="spending-item">
                    <span className="category-name">{category}</span>
                    <span className="category-amount" style={{ color: amount >= 0 ? '#d32f2f' : '#2e7d32' }}>
                      {formatCurrency(amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

                  {/* Recent Transactions */}
        <div className="dashboard-section full-width">
          <div className="transactions-header">
            <h2>Recent Transactions</h2>
            <div className="transaction-filters">
              <div className="filter-group">
                <label htmlFor="start-date">Start Date:</label>
                <input
                  type="date"
                  id="start-date"
                  value={transactionFilters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label htmlFor="end-date">End Date:</label>
                <input
                  type="date"
                  id="end-date"
                  value={transactionFilters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label htmlFor="account-filter">Account:</label>
                <select
                  id="account-filter"
                  value={transactionFilters.accountId}
                  onChange={(e) => handleFilterChange('accountId', e.target.value)}
                  className="filter-input"
                >
                  <option value="">All Accounts</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {account.institution_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="transaction-type-filter-1">Type:</label>
                <select
                  id="transaction-type-filter-1"
                  value={transactionFilters.transactionType}
                  onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                  className="filter-input"
                >
                  <option value="">All Transactions</option>
                  <option value="income">Income</option>
                  <option value="expense">Expenses</option>
                </select>
              </div>
              <div className="filter-group">
                <label htmlFor="keyword-search-2">Search:</label>
                <input
                  type="text"
                  id="keyword-search-2"
                  placeholder="Search transaction names..."
                  value={transactionFilters.keyword}
                  onChange={(e) => handleFilterChange('keyword', e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label htmlFor="category-filter-2">Category:</label>
                <select
                  id="category-filter-2"
                  value={transactionFilters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="filter-input"
                >
                  <option value="">All Categories</option>
                  {Object.keys(spendingSummary).sort().map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={clearFilters} className="clear-filters-btn">
                Clear Filters
              </button>
            </div>
          </div>
          {transactions.length === 0 ? (
            <p className="no-data">No transactions found. Sync your bank account to see transactions.</p>
          ) : (
            <div className="transactions-list">
              {transactions.slice(0, 50).map(transaction => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-info">
                    <h4>{transaction.name}</h4>
                    <p className="transaction-date">{formatDate(transaction.date)}</p>
                    <p className="transaction-account">{transaction.account_name}</p>
                  </div>
                  <div className="transaction-amount">
                    <span className={`amount ${transaction.amount > 0 ? 'expense' : 'income'}`}>
                      {formatCurrency(transaction.amount)}
                    </span>
                    {transaction.primary_category_name && (
                      <span className="transaction-category">{transaction.primary_category_name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    )
  }
}
  
export default Home