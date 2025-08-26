import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import './AutoTagRules.css'

const AutoTagRules = () => {
  const [rules, setRules] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    keywords: '',
    category: '',
    priority: 1,
    is_active: true
  })

  useEffect(() => {
    fetchRules()
    fetchCategories()
  }, [])

  const fetchRules = async () => {
    try {
      const response = await api.get('api/auto-tag-rules/')
      setRules(response.data)
    } catch (error) {
      console.error('Error fetching rules:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await api.get('api/categories/')
      setCategories(response.data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const ruleData = {
        ...formData,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k)
      }
      
      if (formData.id) {
        await api.put(`api/auto-tag-rules/${formData.id}/`, ruleData)
      } else {
        await api.post('api/auto-tag-rules/', ruleData)
      }
      
      setShowForm(false)
      setFormData({ name: '', keywords: '', category: '', priority: 1, is_active: true })
      fetchRules()
    } catch (error) {
      console.error('Error saving rule:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (rule) => {
    setFormData({
      id: rule.id,
      name: rule.name,
      keywords: rule.keywords.join(', '),
      category: rule.category,
      priority: rule.priority,
      is_active: rule.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (ruleId) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        await api.delete(`api/auto-tag-rules/${ruleId}/`)
        fetchRules()
      } catch (error) {
        console.error('Error deleting rule:', error)
      }
    }
  }



  return (
    <div className="auto-tag-rules-container">
      <div className="rules-header">
        <h2>Auto-Tag Rules</h2>
        <div className="header-actions">
          <Link to="/" className="nav-button">Back to Dashboard</Link>
          <button onClick={() => setShowForm(true)} className="add-button">
            Add New Rule
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rule-form">
          <h3>{formData.id ? 'Edit Rule' : 'Add New Rule'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Rule Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Keywords (comma-separated)</label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                placeholder="amazon, online shopping, retail"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                required
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Priority</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
              />
            </div>
            
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                />
                Active
              </label>
            </div>
            
            <div className="form-actions">
              <button type="submit" disabled={loading} className="save-button">
                {loading ? 'Saving...' : 'Save Rule'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="cancel-button">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rules-list">
        {rules.length === 0 ? (
          <p className="no-rules">No auto-tag rules created yet. Create your first rule to automatically categorize transactions.</p>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className="rule-card">
              <div className="rule-header">
                <h4>{rule.name}</h4>
                <div className="rule-actions">
                  <button onClick={() => handleEdit(rule)} className="edit-button">Edit</button>
                  <button onClick={() => handleDelete(rule.id)} className="delete-button">Delete</button>
                </div>
              </div>
              
              <div className="rule-details">
                <p><strong>Keywords:</strong> {rule.keywords.join(', ')}</p>
                <p><strong>Category:</strong> {rule.category_name}</p>
                <p><strong>Priority:</strong> {rule.priority}</p>
                <p><strong>Status:</strong> 
                  <span className={`status ${rule.is_active ? 'active' : 'inactive'}`}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default AutoTagRules
