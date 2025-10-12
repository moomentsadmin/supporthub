import { useEffect, useState } from 'react';

export function AdminSessionDebug() {
  const [cookies, setCookies] = useState('');
  const [sessionTest, setSessionTest] = useState('');

  useEffect(() => {
    // Show current cookies
    setCookies(document.cookie);
    
    // Test session endpoint
    fetch('/api/admin/me', { 
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    .then(res => res.json())
    .then(data => setSessionTest(JSON.stringify(data, null, 2)))
    .catch(err => setSessionTest(`Error: ${err.message}`));
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded max-w-md text-xs z-50">
      <h3 className="font-bold mb-2">Admin Session Debug</h3>
      <div className="mb-2">
        <strong>Cookies:</strong>
        <div className="break-all">{cookies || 'None'}</div>
      </div>
      <div>
        <strong>Session Test:</strong>
        <pre className="whitespace-pre-wrap">{sessionTest}</pre>
      </div>
    </div>
  );
}