if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
const path = require('path');
const twilio = require('twilio');

// Initialize Twilio client with environment variables
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


// MongoDB Atlas connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  phone: String,
  password: String,
  age: String,
  userType: { type: String, enum: ['patient', 'doctor'] },
  branch: String,
  division: String,
  emergencyContact: {
    name: String,
    email: String, // Add this line to include the emergency contact email
    phone: String,
  },
  journal: [{
    content: String,
    mood: String,
    timestamp: { type: Date, default: Date.now }
  }],
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  connectionRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  awards: [String],
  scores: [
    {
      score: Number,
      gameType: String,
      difficulty: String,
      timePerrun: Number,
      movesPerrun: Number,
      rangeOfMovement: [Number],
      timestamp: { type: Date, default: Date.now }
    }
  ]
});


const User = mongoose.model('User', userSchema);
const upcomingEventSchema = new mongoose.Schema({
  event: String,
  date: String,
  date_end: String
});
const UpcomingEvent = mongoose.model('upcoming', upcomingEventSchema);





// Passport initialization
const initializePassport = require('./passport-config');
initializePassport(passport, async (email) => {
  try {
    const user = await User.findOne({ email: email });
    return user;
  } catch (err) {
    console.error("Error fetching user by email:", err);
    return null;
  }
}, async (id) => {
  return await User.findById(id);
});

app.set('view-engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(flash());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days in milliseconds
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Define an async function to fetch upcoming events



// Home page
app.get('/', checkAuthenticated, async (req, res) => {
  try {
    const user = await req.user;
    if (user.userType === 'patient') {
      const latestUpcomingEvents = await fetchAndProcessUpcomingEvents();
      // console.log(latestUpcomingEvents);
      res.render('index.ejs', { user: user, upcomingEvents: latestUpcomingEvents });
    } else {
      res.redirect('/doctor-home');
    }
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).send('Error fetching upcoming events');
  }
});


// Login page
app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs');
});

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true,
}));

// Register page
app.get('/register', checkNotAuthenticated, (req, res) => {
  try {
    // Some code here
    const userrr = req.flash('user');
    res.render('register.ejs', { userrr });  // Pass an object with the key 'err'

  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      // Redirect or return an error message indicating that the email already exists
      req.flash('user', existingUser)
      return res.redirect('/register');
    } else {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const user = new User({
        username: req.body.name,
        email: req.body.email,
        phone: req.body.userPhone,
        password: hashedPassword,
        age: req.body.age,
        userType: req.body.userType,
        branch: req.body.branch,
        division: req.body.division,
        emergencyContact: {
          name: req.body.emergencyName,
          email: req.body.emergencyEmail, // Add this line to include the emergency contact email
          phone: req.body.emergencyPhone,
        } // Add this line to include the emergency contact phone number
      });
      await user.save();
      // Authenticate the user
      req.login(user, (err) => {
        if (err) {
          console.error("Error during login after registration:", err);
          return res.redirect('/login');
        }
        req.flash('success', 'Registration successful. You have been logged in.');
        return res.redirect('/');
      });
    }

  } catch (error) {
    console.error("Error during registration:", error);
    return res.redirect('/register');
  }
});


// Logout route



// Route to render the forum page



app.post('/sendSOS', checkAuthenticated, async (req, res) => {
  try {
    // Get the authenticated user's information
    const user = await req.user;

    // Extract the emergency contact phone number from the user's information
    const emergencyContactPhone = user.emergencyContact.phone;

    // Extract user's name and contact number
    const patientName = user.username;
    const patientContact = user.phone;

    // Send SMS using Twilio
    await client.messages.create({
      body: `THIS IS AN SOS MESSAGE BY YARN, from ${patientName}. Please contact immediately at ${patientContact}.`,
      from: '+15169812980', // Your Twilio phone number
      to: emergencyContactPhone
    });

    console.log('SOS sent successfully.');
    // Set success flash message
    req.flash('success', 'SOS request sent successfully.');

    // Redirect to the home page or any other relevant page
    res.redirect('/');
  } catch (error) {
    console.error('Error sending SOS:', error);
    // Set error flash message
    req.flash('error', 'Failed to send SOS.');

    // Redirect to the home page or any other relevant page
    res.redirect('/');
  }
});







app.post('/edit-profile', checkAuthenticated, async (req, res) => {
  try {
    const user = await req.user; // Assuming the user is authenticated

    // Update user details based on the form input
    user.username = req.body.name;
    user.age = req.body.age;
    user.email = req.body.email;
    user.branch = req.body.branch; // Update branch
    user.division = req.body.division; // Update division

    // Save the updated user to MongoDB
    await user.save();

    // Redirect the user to the profile page or any other relevant page
    req.flash('success', 'Profile updated successfully.');
    res.redirect('/edit-profile'); // Replace 'profile' with the actual route for viewing the profile
  } catch (error) {
    console.error('Error updating profile:', error);
    req.flash('error', 'An error occurred while updating the profile.');
    res.redirect('/edit-profile'); // Redirect back to the edit profile page in case of an error
  }
});


app.delete('/delete-account', checkAuthenticated, async (req, res) => {
  try {
    // Access the currently authenticated user
    const currentUser = await req.user;

    // Perform the deletion logic, for example using Mongoose
    await User.deleteOne({ _id: currentUser._id });

    // Log the user out after deleting the account
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error logging out' });
      }
      res.json({ success: true, message: 'Account deleted successfully' });
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});
// Route for handling the profile update (POST request)
app.post('/edit-profile', checkAuthenticated, async (req, res) => {
  try {
    const user = await req.user; // Assuming the user is authenticated

    // Update user details based on the form input
    user.username = req.body.name;
    user.age = req.body.age;
    user.email = req.body.email;
    user.branch = req.body.branch; // Update branch
    user.division = req.body.division; // Update division

    // Save the updated user to MongoDB
    await user.save();

    // Redirect the user to the profile page or any other relevant page
    req.flash('success', 'Profile updated successfully.');
    res.redirect('/edit-profile'); // Replace 'profile' with the actual route for viewing the profile
  } catch (error) {
    console.error('Error updating profile:', error);
    req.flash('error', 'An error occurred while updating the profile.');
    res.redirect('/edit-profile'); // Redirect back to the edit profile page in case of an error
  }
});








// Middleware to check if user is authenticated
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}




function checkNotAuthenticated(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}



app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
