const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const http = require("http");

require('dotenv').config();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://excel-upload-nine.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const mainRoutes = require('./routes/main.routes');
const { sequelize } = require('./models/model'); // ← add this

app.use('/api/main', mainRoutes);

app.get('/', (req, res) => {
  res.send('Excel-data API is running...');
});


const server = http.createServer(app);
const PORT = process.env.PORT || 8060;

// ← Sync DB then start server
// sequelize.sync({ alter: true })
sequelize.sync()
  .then(() => {
    console.log('Database & tables synced');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to sync database:', err);
  });