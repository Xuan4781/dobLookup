// import React, { useState } from 'react';
// import './App.css';

// function App() {
//   const [address, setAddress] = useState(''); 
//   const [buildingData, setBuildingData] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState('');

//   //starts loading state, clears old error/data
//   const handleSubmit = async (event) => {
//     event.preventDefault(); //stop browser refresh
//     setIsLoading(true);
//     setError('');
//     setBuildingData(null);

//     //API call
//     try{
//       const response = await fetch('http://localhost:5001/api/lookup', {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({address}),
//       });

//       if(!response.ok){
//         const errData = await response.json(); // read JSON error from backend
//         throw new Error(errData.error || 'Something went wrong!');
//       }


//       const data = await response.json();
//       setBuildingData(data);
//       } catch (err) {
//         setError(err.message);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//   return (
//     <div className="App">
//       <header className="App-header">
//         <h1>NYC DOB Lookup</h1>
//         <form onSubmit={handleSubmit} className='lookup-form'>
//           <input
//             type='text'
//             value={address}
//             onChange={(e) => setAddress(e.target.value)}
//             placeholder='Enter Building Address'
//             className='address-input'
//             required
//           />
//           <button type="submit" disabled={isLoading} className='submit-button'>
//             {isLoading ? 'Searching...' : 'Search'}
//           </button>
//         </form>

//         {error && <div className='error-message'>Error: {error}</div>}

//         {buildingData && (
//           <div className='results-container'>
//             <h2>Lookup Results:</h2>
//             <pre>{JSON.stringify(buildingData, null, 2)}</pre>
//           </div>
//         )}
//       </header>
//     </div>
//   );
// }

// export default App;
import React, { useState } from 'react';
import './App.css';

function App() {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // No longer need buildingData state since we are not displaying it
  // const [buildingData, setBuildingData] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    // setBuildingData(null); // No longer needed

    try {
      const response = await fetch('http://localhost:5001/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        // If the server sends an error (like 404), it WILL be JSON
        const errData = await response.json();
        throw new Error(errData.error || 'Something went wrong!');
      }

      // --- START: NEW FILE HANDLING LOGIC ---

      // 1. Get the response body as a Blob (binary data)
      const blob = await response.blob();

      // 2. Create a temporary URL for the Blob
      const url = window.URL.createObjectURL(blob);

      // 3. Create a temporary anchor (<a>) element
      const a = document.createElement('a');
      a.style.display = 'none'; // Keep it hidden
      a.href = url;

      // 4. Set the download filename
      a.download = 'Compliance_Report.docx';

      // 5. Append the anchor to the body and trigger a click to start the download
      document.body.appendChild(a);
      a.click();

      // 6. Clean up by removing the anchor and revoking the URL
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // --- END: NEW FILE HANDLING LOGIC ---

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
            {isLoading ? 'Generating...' : 'Generate Report'}
          </button>
        </form>

        {error && <div className='error-message'>Error: {error}</div>}

        {/* The section to display JSON data is no longer needed */}
        {/* {buildingData && ( ... )} */}
      </header>
    </div>
  );
}

export default App;