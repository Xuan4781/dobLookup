import React, { useState } from 'react';
import './App.css';

function App() {
  const [address, setAddress] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // search bar
  const handleSearch = async () => {
    if (!address) {
      setMessage('Please enter an address.');
      return;
    }
    
    // reset state
    setPreviewData(null);
    setIsLoading(true);
    setMessage('');

    try {
      // url --> backend
      const response = await fetch('http://localhost:5001/api/search-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Address not found.');
      }
      
      setPreviewData(data);

    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // generate report
  const handleGenerateReport = async () => {
    if (!previewData || !previewData.Address) {
      setMessage('No data available to generate report.');
      return;
    }

    setIsLoading(true);
    setMessage('Generating your report...');

    try {
      const response = await fetch('http://localhost:5001/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: previewData.Address }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate the document.');
      }
      
      // file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Compliance_Report.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      setMessage('Report downloaded successfully!');

    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Building Compliance Report Generator</h1>
        
        <div className="input-group">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter building address..."
          />
          <button onClick={handleSearch} disabled={isLoading}>
            Search
          </button>
        </div>


        {isLoading && <div className="message loading">Please wait...</div>}
        {message && <div className="message error">{message}</div>}

        {previewData && (
          <div className="preview-container">
            <h3>Report Preview for: {previewData.Address}</h3>
            <p><strong>Building Owner/Manager:</strong> {previewData["Building Owner/Manager"] || 'N/A'}</p>
            <p><strong>Borough:</strong> {previewData.Borough || 'N/A'}</p>
            <p><strong>BIN:</strong> {previewData.BIN || 'N/A'}</p>
            <p><strong>FISP Compliance Status:</strong> {previewData["FISP Compliance Status"] || 'N/A'}</p>
          </div>
        )}

        {/*generate button */}
        {previewData && (
          <button className="generate-button" onClick={handleGenerateReport} disabled={isLoading}>
            Download Full Report
          </button>
        )}

      </header>
    </div>
  );
}

export default App;