'use client';
import { useState, useEffect } from 'react';
import "../../../styles/pages/alert.css";

export default function AlertUI({ isOpen, onClose, onSave, ticker, currentPrice }) {
  const [condition, setCondition] = useState('price_above');
  const [value, setValue] = useState(currentPrice || '');

  useEffect(() => {
    if (condition.startsWith('pct_')) {
      setValue('5'); 
    } else {
      setValue(currentPrice || '');
    }
  }, [condition, currentPrice]);

  if (!isOpen) return null;

  const isPercent = condition.includes('pct_');

  return (
    <div className="UI-content"> 
      <h2>Set Alert for {ticker}</h2>
      <p>Current Price - {Number(currentPrice).toFixed(2)}</p>
      
      <div className="UI-inputs">
        <label>Condition Type</label>
        <select value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="price_above">Price goes above</option>
            <option value="price_below">Price goes below</option>     
            <option value="pct_change_positive">Percent increase (+%)</option>
            <option value="pct_change_negative">Percent decrease (-%)</option>
        </select>
        
        <label>{isPercent ? "Percentage Change" : "Target Price"}</label>
        <div className="input-wrapper">
          <input 
            type="number" 
            value={value} 
            onChange={(e) => setValue(e.target.value)}
            placeholder={isPercent ? "e.g. 5" : "0.00"}
            step={isPercent ? "0.5" : "0.10"}
          />
          {isPercent && <span className="unit-tag">%</span>}
        </div>
      </div>

      <div className="UI-actions">
        <button className="cancel-btn" onClick={onClose}>Cancel</button>
        <button className="save-btn" onClick={() => onSave(condition, value)}>
          Create Alert
        </button>
      </div>
    </div>
  );
}