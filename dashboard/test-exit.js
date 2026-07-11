const userMessage = 'do you have nyaaaah';
const exitConditions = [
  {
    id: 'ec_1782766217389_vpq',
    description: 'trigger this path when the client ask for "do you have nyaaaah"'
  }
];

fetch('http://localhost:3000/api/chat/exit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ userMessage, exitConditions })
})
.then(res => res.json().then(data => console.log('Status:', res.status, 'Data:', data)))
.catch(console.error);
