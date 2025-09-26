import React, { useState } from 'react';
import './App.css';

function App() {
  const [address, setAddress] = useState(''); 
  const [buildingData, setBuildingData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  //starts loading state, clears old error/data
  const handleSubmit = async (event) => {
    event.preventDefault(); //stop browser refresh
    setIsLoading(true);
    setError('');
    setBuildingData(null);

    //API call
    try{
      const response = await fetch('http://localhost:5001/api/lookup', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({address}),
      });

      if(!response.ok){
        const errData = await response.json(); // read JSON error from backend
        throw new Error(errData.error || 'Something went wrong!');
      }


      const data = await response.json();
      setBuildingData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

  return (
    <div className="App">
      <header className="App-header">
        <h1>NYC DOB Lookup</h1>
        <form onSubmit={handleSubmit} className='lookup-form'>
          <input
            type='text'
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder='Enter Building Address'
            className='address-input'
            required
          />
          <button type="submit" disabled={isLoading} className='submit-button'>
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && <div className='error-message'>Error: {error}</div>}

        {buildingData && (
          <div className='results-container'>
            <h2>Lookup Results:</h2>
            <pre>{JSON.stringify(buildingData, null, 2)}</pre>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
