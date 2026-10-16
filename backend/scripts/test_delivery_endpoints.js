const http = require('http');

async function test() {
  console.log('Testing GET http://localhost:3000/api/v1/orders/delivery without auth (expecting 401)...');
  
  const req = http.get('http://localhost:3000/api/v1/orders/delivery', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`Status Code: ${res.statusCode}`);
      console.log(`Response: ${data}`);
      if (res.statusCode === 401) {
        console.log('PASS: Correctly rejected unauthenticated request with 401 Unauthorized.');
      } else {
        console.log('Response:', data);
      }
    });
  });

  req.on('error', (err) => {
    console.error('Request error:', err.message);
  });
}

test();
