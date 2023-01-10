//requiring all the necessary packages for the project
const express = require("express");
const app = express();
//supports encrypting cookies on the client side to prevent malicious attackers
const csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");


//requiring the models necessary for the app
const { admins, elections, questions, options, voters } = require("./models");

//require body-parser for post routes
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");

//requiring passport js for authentication
//authentication middleware
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");

//requiring session and flash for showing errors
const session = require("express-session");
const flash = require("connect-flash");
const LocalStratergy = require("passport-local");

const saltRounds = 10;

//setting and using all the necessary things
app.set("views", path.join(__dirname, "views"));
app.use(flash());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("This is some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

//using the session key
app.use(
  session({
    secret: "my-super-secret-key-2837428907583420",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use((request, response, next) => {
  response.locals.messages = request.flash();
  next();
});
//initializing passport and session
app.use(passport.initialize());
app.use(passport.session());

//use password as voter
//authentication for voter
passport.use(
  "voter_local",
  new LocalStratergy(
    {
      usernameField: "voterid",
      passwordField: "password",
    },
    function (username, password, done) {
      voters.findOne({ where: { voterid: username } })
        .then(async (user) => {
          const results = await bcrypt.compare(password, user.password);
          if (results) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch((error) => {
          return done(null, false, { message: "Invalid voter-id" });
        });
    }
  )
);

//use passport for admin
//authentication for admin
passport.use(
  "admin_local",
  new LocalStratergy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    function (username, password, done) {
      admins.findOne({ where: { email: username } })
        .then(async (user) => {
          const results = await bcrypt.compare(password, user.password);
          if (results) {
            return done(null, user);
          } else {
            done(null, false, { message: "Invalid password" });
          }
        })
        .catch((error) => {
          console.log(error);
          return done(null, false, { message: "Invalid email-id" });
        });
    }
  )
);


//serializing user using passport
passport.serializeUser((user, done) => {
  done(null, { id: user.id, role: user.role });
});
//deserializing user as passport
//for admin and voter
passport.deserializeUser((id, done) => {
  if (id.role === "admin") {
    admins.findByPk(id.id)
      .then((user1) => {
        done(null, user1);
      })
      .catch((error1) => {
        done(error1, null);
      });
  } else if (id.role === "voter") {
    voters.findByPk(id.id)
      .then((user1) => {
        done(null, user1);
      })
      .catch((error1) => {
        done(error1, null);
      });
  }
});

//setting view engine
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

//landing page
//This is the first page seen when the user enters the root url
app.get("/", async function(req, res){
  if (req.user) {
    console.log(req.user);
    if (req.user.role === "admin") {
      return res.redirect("/elections");
    } else if (req.user.role === "voter") {
      req.logout((err1) => {
        if (err1) {
          return res.json(err1);
        }
        res.redirect("/");
      });
    }
  } else {
    res.render("index", {
      title: "Online Voting Platform",
      csrfToken: req.csrfToken(),
    });
  }
});

//elections home page
//this is the home page for elections
//the page that opens where the admin can add elections
app.get("/elections",
  connectEnsureLogin.ensureLoggedIn(),async function (request1, response1) {
    if (request1.user.role === "admin") {
      let loggedInUser = request1.user.firstName + " " + request1.user.lastName;
      try {
        const elections = await elections.getelections(request1.user.id);
        if (request1.accepts("html")) {
          response1.render("elections", {
            title: "E-Voting Platform",userName: loggedInUser,elections,
          });
        } else {
          return response1.json({elections,});
        }
      } catch (error3) {
        console.log(error3);
        return response1.status(422).json(error3);
      }
    } else if (request1.user.role === "voter") {
      return response1.redirect("/");
    }
  }
);

//signup page
//this is where the user can sign-up
//this is opened when we dont have an account and to create an account
app.get("/signup", function(request2, response2) {
  response2.render("signup", {title: "create admin account",csrfToken: request2.csrfToken(),});
});

//create user account
//this is the page where the admin can create his/her account
app.post("/admin", async function(req, res) {
  if (!req.body.name) {
    req.flash("error", "name is required ");
    return res.redirect("/signup");
  }
  if (!req.body.email) {
    req.flash("error", "email ID is required");
    return res.redirect("/signup");
  }
  if (!req.body.password) {
    req.flash("error", "password is required");
    return res.redirect("/signup"); 
  }
  if (req.body.password.length < 8) {
    req.flash("error", "Length of password should be atleast  8");
    return res.redirect("/signup");
  }
  const hashedPassword1 = await bcrypt.hash(req.body.password, saltRounds);
  try {
    const user = await admins.createadmin({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword1,
    });
    req.login(user, (err) => {
      if (err) {
        console.log(err);
        res.redirect("/");
      } else {
        res.redirect("/elections");
      }
    });
  } catch (error12) {
    req.flash("error", "This Email id is already in use ");
    return res.redirect("/signup");
  }
});

//login page
//this is where the admin can login
app.get("/login", async function (request3, response3){
  if (request3.user) {
    return response3.redirect("/elections");
  }
  response3.render("login_page", {title: "Login to your account",csrfToken: request3.csrfToken(),});
});

//voter login page
//this is the page where the voter can login
app.get("/e/:url/voter", async function (request4, response4) {
  response4.render("login_voter", {title: "Login in as Voter",url: request4.params.url,
    csrfToken: request4.csrfToken(),
  });
});

//login user
//this is the page where the user can log in
//start the session for admin
//if failed redirect to /login else redirect to /elections
app.post("/session",
  passport.authenticate("admin_local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request1, response1) => {
    response1.redirect("/elections");
  }
);

//login voter
//this is the post route where the voter can login
//authencticate the voter if true redirect to /e/url(the one posted by user)
app.post("/e/:url/voter",
  passport.authenticate("voter_local", {
    failureRedirect: "/e/${request5.params.url}/voter",
    failureFlash: true,
  }),
  async function(request5, response5) {
    return response5.redirect(`/e/${request5.params.url}`);
  }
);

//creating new election
//here we are creating a new election
//constraints for election name, length of url(custome one)
app.post("/elections",connectEnsureLogin.ensureLoggedIn(),
  async function (request11, response11) {
    if (request11.user.role === "admin") {
      if (request11.body.name.length < 5) {
        request11.flash("error", "length of election title should be atleast 5");
        return response11.redirect("/elections/create");
      }
      if (request11.body.url.length < 3) {
        request11.flash("error", "Length of url string should be atleast 3");
        return response11.redirect("/elections/create");
      }
      if (
        request11.body.url.includes(" ") ||
        request11.body.url.includes("\t") ||
        request11.body.url.includes("\n")
      ) {
        request11.flash("error", "url string cannot contain spaces");
        return response11.redirect("/elections/create");
      }
      try {
        await elections.add({
          name: request11.body.name,
          url: request11.body.url,
          adminID: request11.user.id,
        });
        return response11.redirect("/elections");
      } catch (error) {
        request11.flash("error", "URL is already in use");
        return response11.redirect("/elections/create");
      }
    } else if (request11.user.role === "voter") {
      return response11.redirect("/");
    }
  }
);
//if constraints are validated create model, if same url is given for the election 
//show an error and give a different one 

//new election page
//this is a page when a new election is created
app.get("/elections/create",
  connectEnsureLogin.ensureLoggedIn(),async function(request9, response9) {
    if (request9.user.role === "admin") {
      return response9.render("new_election_page", {
        title: "create an election",
        csrfToken: request9.csrfToken(),
      });
    } else if (request9.user.role === "voter") {
      return response9.redirect("/");
    }
  }
);


//election page
//this is the election page
//this page gives us the public url, number of voters, number of questions in the ballot
//title of the election
app.get("/elections/:id",
  connectEnsureLogin.ensureLoggedIn(),async function (req, res) {
    if (req.user.role === "admin") {
      try {
        const election1 = await elections.GetElection(req.params.id);
        const numberOfQuestionsAre = await questions.GetQuestionCount(
          req.params.id
        );
        const numberOfVotersAre = await voters.VoterCount(req.params.id);
        return res.render("elections_page", {
          id: req.params.id,
          title: election1.name,
          url: election1.url,
          launch: election1.launch,
          nq: numberOfQuestionsAre,
          nv: numberOfVotersAre,
        });
      } catch (error2) {
        console.log(error2);
        return res.status(422).json(error2);
      }
    } else if (req.user.role === "voter") {
      return res.redirect("/");
    }
  }
);

//add question page
//this is the page from where we can add the questions
//this is the page where we can create the questions
app.get("/elections/:id/questions/create",
  connectEnsureLogin.ensureLoggedIn(),async function (request2, response1){
    if (request2.user.role === "admin") {
      try {
        const election3 = await elections.GetElection(request2.params.id);
        if (!election3.launch) {
          return response1.render("new_question_page", {
            id: request2.params.id,
            csrfToken: request2.csrfToken(),
          });
        } else {
          request2.flash("error", "you cannot edit while election is running ");
          return response1.redirect(`/elections/${request2.params.id}/`);
        }
      } catch (error1) {
        console.log(error1);
        return response1.status(422).json(error1);
      }
    } else if (request2.user.role === "voter") {
      return response1.redirect("/");
    }
  }
);

//manage questions page
//this is the page from where you can manage the questions
//this page shows all the questions, and we can add questions, delete questions etc..
app.get("/elections/:id/questions",
  connectEnsureLogin.ensureLoggedIn(),async function (request1, response) {
    if (request1.user.role === "admin") {
      try {
        const election2 = await elections.GetElection(request1.params.id);
        const questions2 = await questions.GetQuestions(request1.params.id);
        if (!election2.running) {
          if (request1.accepts("html")) {
            return response.render("all_questions", {
              title: election2.name,
              id: request1.params.id,
              questions: questions2,
              csrfToken: request1.csrfToken(),
            });
          } else {
            return response.json({
              questions2,
            });
          }
        } else {
          request1.flash("error", "you cannot edit while election is running ");
          return response.redirect(`/elections/${request1.params.id}/`);
        }
      } catch (error1) {
        console.log(error1);
        return response.status(422).json(error1);
      }
    } else if (request1.user.role === "voter") {
      return response.redirect("/");
    }
  }
);

//add question
//this is the page from where we can add the questions
app.post("/elections/:id/questions/create",
  connectEnsureLogin.ensureLoggedIn(),async function (request3, response3){
    if (request3.user.role === "admin") {
      if (request3.body.name.length < 5) {
        request3.flash("error", "Length of question should be of atleast 5 characters");
        return response3.redirect(`/elections/${request3.params.id}/questions/create`);
      }
      try {
        const elections = await elections.GetElection(request3.params.id);
        if (elections.launch) {
          request3.flash("error", "can't edit while election is in running mode");
          return response3.redirect(`/elections/${request3.params.id}/`);
        }
        const question = await questions.add({
          name: request3.body.name,
          description: request3.body.description,
          electionID: request3.params.id,
        });
        return response3.redirect(`/elections/${request3.params.id}/questions/${question.id}`);
      } catch (error1) {
        console.log(error1);
        return response3.status(422).json(error1);
      }
    } else if (request3.user.role === "voter") {
      return response3.redirect("/");
    }
  }
);

//edit question page
//this the page where we can edit the questions
//admin can edit the questions here
//for a particular election
app.get("/elections/:electionID/questions/:questionID/edit",
  connectEnsureLogin.ensureLoggedIn(),async function (request5, response5){
    if (request5.user.role === "admin") {
      try {
        const elections = await elections.getElection(request5.params.electionID);
        if (elections.launch) {
          request5.flash("error", "can't edit while election is in running mode");
          return response5.redirect(`/elections/${request5.params.id}/`);
        }
        const questions = await questions.getQuestion(request5.params.questionID);
        return response5.render("edit_question_page", {
          electionID: request5.params.electionID,
          questionID: request5.params.questionID,
          name: questions.name,
          description: questions.description,
          csrfToken: request5.csrfToken(),
        });
      } catch (error5) {
        console.log(error5);
        return response5.status(422).json(error5);
      }
    } else if (request5.user.role === "voter") {
      return response5.redirect("/");
    }
  }
);

//edit question
//you can edit the question from here
app.put("/questions/:questionID/edit",
  connectEnsureLogin.ensureLoggedIn(),async function(request6, response6)  {
    if (request6.user.role === "admin") {
      if (request6.body.name.length < 6) {
        request6.flash("error", "Length of question should be atleast 6 ");
        return response6.json({
          error: "Length of question should be atleast 6",
        });
      }
      try {
        const updatedQuestionIs = await questions.EditQuestion({
          name: request6.body.name,
          description: request6.body.description,
          id: request6.params.questionID,
        });
        return response6.json(updatedQuestionIs);
      } catch (error6) {
        console.log(error6);
        return response6.status(422).json(error6);
      }
    } else if (request6.user.role === "voter") {
      return response6.redirect("/");
    }
  }
);

//delete question
//delete the unnecessary questions
//only when number of questions are greater than two
app.delete("/elections/:electionID/questions/:questionID",
  connectEnsureLogin.ensureLoggedIn(),async function(request7, response7) {
    if (request7.user.role === "admin") {
      try {
        //to get number of questions
        const numq = await questions.GetQuestionCount(
          request7.params.electionID
        );
        //update here
        if (numq > 0) {
          //to delete a question
          const res1 = await questions.delete(request7.params.questionID);
          return response7.json({ success: res1 === 1 });
        } else {
          return response7.json({ success: false });
        }
      } catch (error7) {
        console.log(error7);
        return response7.status(422).json(error7);
      }
    } else if (request7.user.role === "voter") {
      return response7.redirect("/");
    }
  }
);

//question page
//page of questions
app.get("/elections/:id/questions/:questionID",
  connectEnsureLogin.ensureLoggedIn(),async function(request8, response8)  {
    if (request8.user.role === "admin") {
      try {
        //we are retrieving questions, options and election
        //when the election is launched we cant edit the questions
        const questions = await questions.GetQuestions(request8.params.questionID);
        const options = await options.GetOptions(request8.params.questionID);
        const election = await elections.GetElection(request8.params.id);
        if (election.launch) {
          request8.flash("error", "can't edit while election is running");
          return response8.redirect(`/elections/${request8.params.id}/`);
        }
        if (request8.accepts("html")) {
          response8.render("questions_page", {
            title: questions.name,
            description: questions.description,
            id: request8.params.id,
            questionID: request8.params.questionID,
            options,
            csrfToken: request8.csrfToken(),
          });
        } else {
          return response8.json({
            options,
          });
        }
      } catch (error8) {
        console.log(error8);
        return response8.status(422).json(error8);
      }
    } else if (request8.user.role === "voter") {
      return response8.redirect("/");
    }
  }
);

//adding options
//option are being added from here
app.post("/elections/:id/questions/:questionID",
  connectEnsureLogin.ensureLoggedIn(),async function(request9, response9) {
    if (request9.user.role === "admin") {
      if (!request9.body.option) {
        request9.flash("error", "please do enter an option!!!");
        return response9.redirect(
          `/elections/${request9.params.id}/questions/${request9.params.questionID}`
        );
      }
      try {
        const election = await elections.getElection(request9.params.id);
        if (election.launch) {
          request9.flash("error", "cant edit while election is running!!!");
          return response9.redirect(`/elections/${request9.params.id}/`);
        }
        await options.add({
          option: request9.body.option,
          questionID: request9.params.questionID,
        });
        return response9.redirect(
          `/elections/${request9.params.id}/questions/${request9.params.questionID}`
        );
      } catch (error) {
        console.log(error);
        return response9.status(422).json(error);
      }
    } else if (request9.user.role === "voter") {
      return response9.redirect("/");
    }
  }
);

//delete options
//options can deleted when this route is visited
//deleting an option
//only the admin can delete
app.delete("/options/:optionID",
  connectEnsureLogin.ensureLoggedIn(),async function(request12, response12) {
    if (request12.user.role === "admin") {
      try {
        const res = await options.delete(request12.params.optionID);
        return response12.json({ success: res === 1 });
      } catch (errora) {
        console.log(errora);
        return response12.status(422).json(errora);
      }
    } else if (request12.user.role === "voter") {
      return response12.redirect("/");
    }
  }
);

//edit option page
app.get("/elections/:electionID/questions/:questionID/options/:optionID/edit",
  connectEnsureLogin.ensureLoggedIn(),async function(requesta, responsea) {
    if (requesta.user.role === "admin") {
      try {
        const electiona = await elections.GetElection(requesta.params.electionID);
        if (electiona.launch) {
          requesta.flash("error", "can't edit while election is in running mode!!!");
          return responsea.redirect(`/elections/${requesta.params.id}/`);
        }
        const optiona = await options.GetOption(requesta.params.optionID);
        return responsea.render("edit_option_page", {
          option: optiona.option,
          csrfToken: requesta.csrfToken(),
          electionID: requesta.params.electionID,
          questionID: requesta.params.questionID,
          optionID: requesta.params.optionID,
        });
      } catch (error) {
        console.log(error);
        return responsea.status(422).json(error);
      }
    } else if (requesta.user.role === "voter") {
      return responsea.redirect("/");
    }
  }
);


//update options
//route for updating the options


app.put("/options/:optionID/edit",
  connectEnsureLogin.ensureLoggedIn(),async function (requestb, responseb) {
    if (requestb.user.role === "admin") {
      if (!requestb.body.option) {
        requestb.flash("error", "Please do enter an option");
        return responseb.json({
          error: "Please enter option",
        });
      }
      try {
        const updatedOptionsAre = await options.edit({
          id: requestb.params.optionID,
          option: requestb.body.option,
        });
        return responseb.json(updatedOptionsAre);
      } catch (errorb) {
        console.log(errorb);
        return responseb.status(422).json(errorb);
      }
    } else if (requestb.user.role === "voter") {
      return responseb.redirect("/");
    }
  }
);



//add voter page
//this is the page where we can add voters
//create new voters
app.get("/elections/:electionID/voters/create",
  connectEnsureLogin.ensureLoggedIn(),async function(requeste, responsee) {
    if (requeste.user.role === "admin") {
      responsee.render("new_voters_page", {
        title: "Warning!!!",
        electionID: requeste.params.electionID,
        csrfToken: requeste.csrfToken(),
      });
    } else if (requeste.user.role === "voter") {
      return responsee.redirect("/");
    }
  }
);

//voter page
app.get("/elections/:electionID/voters",
  connectEnsureLogin.ensureLoggedIn(),async function(request9, response9) {
    if (request9.user.role === "admin") {
      try {
        const voters = await voters.gettVoters(request9.params.electionID);
        const elections = await elections.getElection(request9.params.electionID);
        if (request9.accepts("html")) {
          return response9.render("voters_page", {
            title: elections.name,
            id: request9.params.electionID,
            voters,
            electionID: request9.params.electionID,
            csrfToken: request9.csrfToken(),
          });
        } else {
          return response9.json({voters,});
        }
      } catch (error9) {
        console.log(error9);
        return response9.status(422).json(error9);
      }
    } else if (request9.user.role === "voter") {
      return response9.redirect("/");
    }
  }
);


//add voter
//this is where the admin can register the voters using voterid and password
app.post("/elections/:electionID/voters/create",
  connectEnsureLogin.ensureLoggedIn(),async function(requestr, responser) {
    if (requestr.user.role === "admin") {
      if (!requestr.body.voterid) {
        requestr.flash("error", "please do enter voterID!!!");
        return responser.redirect(`/elections/${requestr.params.electionID}/voters/create`);
      }
      if (!requestr.body.password) {
        requestr.flash("error", "please do enter your password!!!");
        return responser.redirect(
          `/elections/${requestr.params.electionID}/voters/create`
        );
      }
      if (requestr.body.password.length < 6) {
        requestr.flash("error", "length of password should be of atleast 8 characters!!!");
        return responser.redirect(
          `/elections/${requestr.params.electionID}/voters/create`
        );
      }
      const hashedPassword1 = await bcrypt.hash(requestr.body.password, saltRounds);
      try {
        await voters.add({
          voterid: requestr.body.voterid,
          password: hashedPassword1,
          electionID: requestr.params.electionID,
        });
        return responser.redirect(
          `/elections/${requestr.params.electionID}/voters`
        );
      } catch (errorr) {
        requestr.flash("error", "voter ID is already in use by someone else!!!");
        return responser.redirect(
          `/elections/${requestr.params.electionID}/voters/create`
        );
      }
    } else if (requestr.user.role === "voter") {
      return responser.redirect("/");
    }
  }
);


//delete voter
//to delete unnecessary voter
app.delete("/elections/:electionID/voters/:voterID",
  connectEnsureLogin.ensureLoggedIn(),async function(requestz, responsez) {
    if (requestz.user.role === "admin") {
      try {
        const res2 = await voters.delete(requestz.params.voterID);
        return responsez.json({ success: res2 === 1 });
      } catch (errorz) {
        console.log(errorz);
        return responsez.status(422).json(errorz);
      }
    } else if (requestz.user.role === "voter") {
      return responsez.redirect("/");
    }
  }
);




//election preview
//this is the page like how the voting page looks like when the user opens it
app.get("/elections/:electionID/preview",
  connectEnsureLogin.ensureLoggedIn(),async function (requestl, responsel) {
    if (requestl.user.role === "admin") {
      try {
        const election = await elections.GetElection(requestl.params.electionID);
        const questions = await questions.GetQuestions(
          requestl.params.electionID
        );
        let options = [];
        for (let question in questions) {
          const question_options = await options.GetOptions(
            questions[question].id
          );
          if (question_options.length < 2) {
            requestl.flash(
              "error","Make sure to please add atleast two options to the question below!!!"
            );
            requestl.flash(
              "error","Make sure there should be atleast two options in each question!!!"
            );
            return responsel.redirect(
              `/elections/${requestl.params.electionID}/questions/${questions[question].id}`
            );
          }
          options.push(question_options);
        }

        if (questions.length < 1) {
          requestl.flash(
            "error",
            "Make sure to please add atleast one question in the ballot!!!"
          );
          return responsel.redirect(`/elections/${requestl.params.electionID}/questions`);
        }

        return responsel.render("vote_preview_page", {
          title: election.name,
          electionID: requestl.params.electionID,
          questions,
          options,
          csrfToken: requestl.csrfToken(),
        });
      } catch (errorl) {
        console.log(errorl);
        return responsel.status(422).json(errorl);
      }
    } else if (requestl.user.role === "voter") {
      return responsel.redirect("/");
    }
  }
);


//launch an election
//link can be publically accessible and the registered voters can vote
app.put("/elections/:electionID/launch",
  connectEnsureLogin.ensureLoggedIn(),async function (requestk, responsek) {
    if (requestk.user.role === "admin") {
      try {
        const launchedElection = await elections.launchAnElection(
          requestk.params.electionID
        );
        return responsek.json(launchedElection);
      } catch (errork) {
        console.log(errork);
        return responsek.status(422).json(errork);
      }
    } else if (requestk.user.role === "voter") {
      return responsek.redirect("/");
    }
  }
);

//live url
app.get("/e/:url/", async function (requestaa, responseaa){
  if (!requestaa.user) {
    requestaa.flash("error", "Please do login before trying to vote!!!");
    return responseaa.redirect(`/e/${requestaa.params.url}/voter`);
  }
  try {
    const election = await elections.getElectionurl(requestaa.params.url);
    if (requestaa.user.role === "voter") {
      if (election.launch) {
        const questions = await questions.getQuestionss(election.id);
        let options = [];
        for (let question in questions) {
          options.push(await options.getOptionss(questions[question].id));
        }
        return responseaa.render("vote_page", {
          title: election.name,
          electionID: election.id,
          questions,
          options,
          csrfToken: requestaa.csrfToken(),
        });
      } else {
        return responseaa.render("404_not_found");
      }
    } else if (requestaa.user.role === "admin") {
      requestaa.flash("error", "Hey you can't vote as an admin!!!");
      requestaa.flash("error", "please do signout as an admin before trying to vote!!!");
      return responseaa.redirect(`/elections/${election.id}`);
    }
  } catch (erroraa) {
    console.log(erroraa);
    return responseaa.status(422).json(erroraa);
  }
});

//success page
app.get("/success",async function(req,res){
  res.render("success_page");
});

//results page
app.get("/results_page",async function(req,res){
  res.render("results_page");
});

//signout
//this is the route for signing out the user
app.get("/signout", function (request6, response6, next){
  request6.logout((err1) => {
    if (err1) {
      return next(err1);
    }
    response6.redirect("/");
  });
});


module.exports = app;