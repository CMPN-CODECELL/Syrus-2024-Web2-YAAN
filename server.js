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


const forumSchema = new mongoose.Schema({
  heading: {
    type: String,
    required: true
  },
  description: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  tags: [String],
  comments: [{
    content: String,
    author: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  likes: {
    type: Number,
    default: 0
  }

});

const Forum = mongoose.model('Forum', forumSchema);





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
app.get('/add-doctor', checkAuthenticated, async (req, res) => {
  try {
    const user = await req.user;
    const doctors = await getDoctorList(user);

    if (doctors.length > 0) {
      res.render('add-doctor.ejs', { user, doctors });
    } else {
      res.render('add-doctor.ejs', { user, doctors: [] });
    }
  } catch (error) {
    console.error('Error rendering add-doctor page:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});
app.get('/forum', checkAuthenticated, async (req, res) => {
  try {
    // Assuming user is authenticated, retrieve the user from req.user
    const user = await req.user;

    // Fetch forum data from the database
    const forums = await Forum.find({}).populate('createdBy').exec();

    // Render the forum page and pass the forum data and user data to the EJS template
    res.render('forum.ejs', { user: user, forums: forums });
  } catch (error) {
    console.error('Error fetching forum data:', error);
    // Handle the error appropriately, for example, redirecting to an error page
    res.status(500).send('Internal Server Error');
  }
});


// POST request to create a new forum post
app.post('/forum', checkAuthenticated, async (req, res) => {
  try {
    // Extract data from the request body
    const { heading, description, tags } = req.body;
    const user = await req.user; // Assuming the user is authenticated

    // Create a new forum post instance
    const newPost = new Forum({
      heading: heading,
      description: description,
      createdBy: user._id, // Assuming req.user contains the current user's information
      tags: tags.split(','), // Split tags string into an array
    });

    // Save the new forum post to the database
    await newPost.save();

    // Redirect the user to the forum page or any other relevant page
    req.flash('success', 'Forum post created successfully.');
    res.redirect('/forum');
  } catch (error) {
    console.error('Error creating forum post:', error);
    req.flash('error', 'An error occurred while creating the forum post.');
    res.redirect('/forum'); // Redirect back to the forum page in case of an error
  }
});

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



// Handle doctor addition form submission
app.post('/add-doctor', checkAuthenticated, async (req, res) => {
  try {
    const patient = await req.user; // Retrieve the user from the database
    // console.log(patient);
    // console.log("Aaaaaaaaa");

    const { doctorName, doctorEmail } = req.body;

    // Check if the doctor with the specified name and email exists
    const doctor = await User.findOne({ username: doctorName, email: doctorEmail, userType: 'doctor' });

    // Get the updated list of doctors
    const doctors = await getDoctorList(patient);
    console.log(doctors)

    if (!doctor) {
      return res.render('add-doctor.ejs', { success: false, error: 'Invalid doctor name or email', user: patient, doctors: doctors });
    }

    // Check if the doctor is already in the patient's connections
    if (patient.connections.includes(doctor._id.toString())) {
      console.log("Doctor is already in connections");
      return res.render('add-doctor.ejs', { success: false, error: 'Doctor is already in your connections', user: patient, doctors: doctors });
    }

    // Check if the connection request has already been sent by the doctor
    if (doctor.connectionRequests.includes(patient._id.toString())) {
      // console.log("baby");
      return res.render('add-doctor.ejs', { success: false, error: 'Request already sent', user: patient, doctors: doctors });
    }

    // Store the connection request only on the doctor's side
    doctor.connectionRequests.push(patient._id.toString());
    await doctor.save();


    res.render('add-doctor.ejs', { success: true, message: 'Request successfully sent', user: patient, doctors: doctors });
  } catch (error) {
    console.error('Error adding doctor:', error);
    res.render('add-doctor.ejs', { success: false, message: 'Internal Server Error', user: req.user, error: error.message, doctors: doctors });
  }
});


app.delete('/remove-foreign-user', checkAuthenticated, async (req, res) => {
  try {
    const currentUser = await req.user; // Assuming req.user contains the current doctor's information

    // Extract foreignId from the request body
    const foreignId = req.body.foreignId;

    // Check if the foreignId is valid (you might want to add more validation)
    if (!foreignId) {
      return res.status(400).json({ success: false, message: 'Invalid foreignId' });
    }

    // Remove the foreignId from the user's connections
    currentUser.connections = currentUser.connections.filter(connection => connection.toString() !== foreignId);
    await currentUser.save();

    // Remove the user from the foreignId's connections
    const foreignUser = await User.findById(foreignId);
    if (foreignUser) {
      foreignUser.connections = foreignUser.connections.filter(connection => connection.toString() !== currentUser._id.toString());
      await foreignUser.save();
    }

    res.status(200).json({ success: true, message: 'Patient removed successfully' });
  } catch (error) {
    console.error('Error removing patient:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
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
