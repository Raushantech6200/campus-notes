/* ==================================================
   AIMT NOTES HUB - script.js  (Firebase version)
================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    addDoc,
    deleteDoc,
    getDocs,
    collection,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* =========================
   1) APNI VALUES YAHAN DAALO
========================= */

const firebaseConfig = {
  apiKey: "AIzaSyAjh9MI1PYb37bgRvdfuX3XecDwvjuw23E",
  authDomain: "aimt-notes-hub-rk.firebaseapp.com",
  projectId: "aimt-notes-hub-rk",
  storageBucket: "aimt-notes-hub-rk.firebasestorage.app",
  messagingSenderId: "170081858592",
  appId: "1:170081858592:web:d5b53ebdccfb89c4b2b845",
  measurementId: "G-NFHB9K3PLP"
};


const CLOUDINARY_CLOUD_NAME   = "dlyjjogo";
const CLOUDINARY_UPLOAD_PRESET = "aimt_notes";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);


/* =========================
   BRANCHES + SUBJECTS
========================= */

const BRANCHES = [
    {
        key: "common", name: "First Year (Common)", icon: "1", color: "#287ce0",
        subjects: [
            "Engineering Mathematics", "Engineering Physics", "Engineering Chemistry",
            "Environmental Studies (EVS)", "Basic Electrical Engineering", "Basic Electronics",
            "Programming for Problem Solving", "Engineering Graphics", "Communication Skills"
        ]
    },
    {
        key: "cse", name: "Computer Science (CSE)", icon: "CS", color: "#e50914",
        subjects: [
            "Data Structures", "Algorithms", "Database Management System", "Operating System",
            "Computer Networks", "Object Oriented Programming", "Software Engineering",
            "Theory of Computation", "Compiler Design", "Artificial Intelligence",
            "Machine Learning", "Web Technology"
        ]
    },
    {
        key: "it", name: "Information Technology (IT)", icon: "IT", color: "#7550dd",
        subjects: [
            "Data Structures", "Database Management System", "Computer Networks",
            "Operating System", "Web Technology", "Cloud Computing",
            "Information Security", "Software Engineering", "Data Mining"
        ]
    },
    {
        key: "ece", name: "Electronics (ECE)", icon: "EC", color: "#efa914",
        subjects: [
            "Analog Electronics", "Digital Electronics", "Signals and Systems",
            "Network Analysis", "Electromagnetic Field Theory", "Microprocessors",
            "Communication Systems", "VLSI Design", "Control Systems"
        ]
    },
    {
        key: "ee", name: "Electrical (EE)", icon: "EE", color: "#25a967",
        subjects: [
            "Circuit Theory", "Electrical Machines", "Power Systems", "Control Systems",
            "Power Electronics", "Measurements and Instrumentation",
            "Electromagnetic Fields", "Switchgear and Protection"
        ]
    },
    {
        key: "me", name: "Mechanical (ME)", icon: "ME", color: "#0e9aa7",
        subjects: [
            "Engineering Mechanics", "Thermodynamics", "Fluid Mechanics",
            "Strength of Materials", "Theory of Machines", "Manufacturing Process",
            "Heat and Mass Transfer", "Machine Design", "Refrigeration and Air Conditioning"
        ]
    },
    {
        key: "ce", name: "Civil (CE)", icon: "CE", color: "#c2682a",
        subjects: [
            "Surveying", "Building Materials", "Structural Analysis", "Concrete Technology",
            "Geotechnical Engineering", "Fluid Mechanics", "Transportation Engineering",
            "Environmental Engineering", "Design of Steel Structures"
        ]
    }
];

function getBranch(key){
    return BRANCHES.find(function(b){ return b.key === key; });
}


/* =========================
   STATE + HELPERS
========================= */

const state = {
    user: null,            // {uid, name, mobile, branch, username}
    page: "loginPage",
    branchKey: null,
    subject: null,

    pending: null,         // user waiting for OTP
    otp: null,
    otpExpiry: 0,
    otpTries: 0,
    lastOtpTime: 0,

    notes: [],
    unsubNotes: null,
    commentUnsubs: {},
    commentCache: {}
};

const openComments = new Set();

function $(id){
    return document.getElementById(id);
}

function safe(text){
    return String(text == null ? "" : text)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#39;");
}

// Firebase ko email chahiye, isliye username ko email jaisa bana rahe hain
function usernameToEmail(username){
    return username.toLowerCase() + "@aimtnotes.app";
}

function authMessage(e){
    const code = e && e.code ? e.code : "";

    if(code === "auth/email-already-in-use"){
        return "This username is already taken. Try another one.";
    }
    if(code === "auth/invalid-credential" ||
       code === "auth/wrong-password" ||
       code === "auth/user-not-found" ||
       code === "auth/invalid-email"){
        return "Username or password is incorrect.";
    }
    if(code === "auth/too-many-requests"){
        return "Too many attempts. Please try again after some time.";
    }
    if(code === "auth/network-request-failed"){
        return "Network problem. Check your internet connection.";
    }
    if(code === "permission-denied" || code === "firestore/permission-denied"){
        return "Permission denied. Check your Firestore rules.";
    }

    return (e && e.message) ? e.message : "Something went wrong.";
}


/* =========================
   PAGE / PANEL SWITCHING
========================= */

function showPage(id){
    ["loginPage","homePage","branchPage","subjectPage"].forEach(function(p){
        $(p).style.display = "none";
    });

    $(id).style.display = (id === "loginPage") ? "flex" : "block";

    state.page = id;
    window.scrollTo(0,0);
}

function showPanel(id){
    ["loginPanel","registerPanel","otpPanel"].forEach(function(p){
        $(p).style.display = "none";
    });

    $(id).style.display = "block";

    ["loginError","regError","otpError"].forEach(function(e){
        $(e).innerText = "";
    });
}


/* =========================
   REGISTRATION
========================= */

function fillBranchSelects(){
    let html = '<option value="">Select Branch</option>';

    BRANCHES.forEach(function(b){
        html += '<option value="' + b.key + '">' + safe(b.name) + '</option>';
    });

    $("regBranch").innerHTML = html;
    $("noteBranch").innerHTML = html;
}

async function registerStudent(event){
    event.preventDefault();

    const form = event.target;
    const err = $("regError");
    err.style.color = "#ff8a94";
    err.innerText = "";

    const name     = $("regName").value.trim();
    const mobile   = $("regMobile").value.trim();
    const branch   = $("regBranch").value;
    const username = $("regUser").value.trim();
    const pass     = $("regPass").value;
    const pass2    = $("regPass2").value;

    if(name.length < 3){
        err.innerText = "Please enter your full name.";
        return;
    }

    if(!/^[6-9]\d{9}$/.test(mobile)){
        err.innerText = "Enter a valid 10 digit mobile number.";
        return;
    }

    if(!branch){
        err.innerText = "Please select your branch.";
        return;
    }

    if(!/^[a-zA-Z0-9_]{4,20}$/.test(username)){
        err.innerText = "Username: 4-20 letters, numbers or underscore only.";
        return;
    }

    if(pass.length < 6 || !/[a-zA-Z]/.test(pass) || !/\d/.test(pass)){
        err.innerText = "Password needs at least 6 characters with a letter and a number.";
        return;
    }

    if(pass !== pass2){
        err.innerText = "Both passwords must match.";
        return;
    }

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;

    try{
        const cred = await createUserWithEmailAndPassword(
            auth, usernameToEmail(username), pass
        );

        await setDoc(doc(db, "users", cred.user.uid), {
            name: name,
            mobile: mobile,
            branch: branch,
            username: username,
            createdAt: serverTimestamp()
        });

        // login OTP ke through hoga, isliye abhi sign out
        await signOut(auth);

        form.reset();

        showPanel("loginPanel");
        $("loginUser").value = username;
        $("loginError").style.color = "#7dffb0";
        $("loginError").innerText =
            "Registration complete. Now login with your username and password.";

    }catch(e){
        err.innerText = authMessage(e);
    }finally{
        btn.disabled = false;
    }
}


/* =========================
   LOGIN STEP 1 : username + password
========================= */

async function loginStep1(event){
    event.preventDefault();

    const err = $("loginError");
    err.style.color = "#ff8a94";
    err.innerText = "";

    const username = $("loginUser").value.trim();
    const pass     = $("loginPass").value;

    if(!/^[a-zA-Z0-9_]{4,20}$/.test(username)){
        err.innerText = "Username or password is incorrect.";
        return;
    }

    const btn = event.target.querySelector("button[type=submit]");
    btn.disabled = true;

    try{
        const cred = await signInWithEmailAndPassword(
            auth, usernameToEmail(username), pass
        );

        const snap = await getDoc(doc(db, "users", cred.user.uid));

        if(!snap.exists()){
            await signOut(auth);
            err.innerText = "Profile not found. Please register again.";
            return;
        }

        state.pending = Object.assign({ uid: cred.user.uid }, snap.data());

        sendOtp();
        showPanel("otpPanel");
        $("otpInput").value = "";
        $("otpInput").focus();

    }catch(e){
        err.innerText = authMessage(e);
    }finally{
        btn.disabled = false;
    }
}


/* =========================
   LOGIN STEP 2 : OTP (DEMO 2-FACTOR)
========================= */

function generateOtp(){
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return String(100000 + (arr[0] % 900000));
}

function sendOtp(){
    state.otp = generateOtp();
    state.otpExpiry = Date.now() + 5 * 60 * 1000;
    state.otpTries = 0;
    state.lastOtpTime = Date.now();

    const masked = "XXXXXX" + state.pending.mobile.slice(-4);

    $("otpInfo").innerText = "Enter the 6 digit OTP sent to " + masked;

    /* DEMO: asli SMS ke liye Firebase Phone Auth (Blaze plan) ya MSG91 lagana hoga.
       Tab is box ko hata dena. */
    $("otpDemo").innerHTML =
        "Demo SMS to " + masked + ":<br>" +
        "Your AIMT Notes Hub OTP is <b>" + state.otp + "</b>" +
        "<small>Valid for 5 minutes. Demo mode: real SMS abhi connected nahi hai.</small>";
}

function verifyOtp(event){
    event.preventDefault();

    const err = $("otpError");
    err.innerText = "";

    const code = $("otpInput").value.trim();

    if(Date.now() > state.otpExpiry){
        err.innerText = "OTP expired. Click Resend OTP.";
        return;
    }

    if(state.otpTries >= 3){
        err.innerText = "Too many wrong attempts. Click Resend OTP.";
        return;
    }

    if(code !== state.otp){
        state.otpTries++;
        err.innerText = "Wrong OTP. Attempts left: " + (3 - state.otpTries);
        return;
    }

    state.user = state.pending;
    state.pending = null;
    state.otp = null;

    sessionStorage.setItem("otpOk", state.user.uid);

    $("loginPass").value = "";
    enterSite();
}

function resendOtp(){
    const wait = 30 - Math.floor((Date.now() - state.lastOtpTime) / 1000);

    if(wait > 0){
        $("otpError").innerText = "Please wait " + wait + " seconds before resending.";
        return;
    }

    sendOtp();
    $("otpInput").value = "";
    $("otpError").innerText = "";
}

async function cancelOtp(){
    state.pending = null;
    state.otp = null;
    showPanel("loginPanel");

    try{ await signOut(auth); }catch(e){}
}


/* =========================
   AUTH STATE (page refresh handling)
========================= */

let firstAuthEvent = true;

onAuthStateChanged(auth, async function(user){

    const first = firstAuthEvent;
    firstAuthEvent = false;

    if(!user){
        state.user = null;
        stopListeners();

        if(state.page !== "loginPage"){
            showPage("loginPage");
            showPanel("loginPanel");
        }
        return;
    }

    // refresh ke baad: OTP pehle ho chuka hai to seedha andar
    if(sessionStorage.getItem("otpOk") === user.uid){

        if(!state.user){
            try{
                const snap = await getDoc(doc(db, "users", user.uid));

                if(snap.exists()){
                    state.user = Object.assign({ uid: user.uid }, snap.data());
                    enterSite();
                }
            }catch(e){
                console.error(e);
            }
        }

        return;
    }

    // browser band karke dobara khola aur OTP nahi hua -> logout
    if(first){
        try{ await signOut(auth); }catch(e){}
    }
});


/* =========================
   ENTER SITE / LOGOUT
========================= */

function enterSite(){
    const chip = "👤 " + safe(state.user.name);

    ["userChip","userChip2","userChip3"].forEach(function(id){
        $(id).innerHTML = chip;
    });

    startNotesListener();
    goHome();
}

async function logout(){
    sessionStorage.removeItem("otpOk");
    openComments.clear();
    stopListeners();

    state.user = null;
    state.notes = [];

    try{ await signOut(auth); }catch(e){}

    showPage("loginPage");
    showPanel("loginPanel");
}


/* =========================
   FIRESTORE LISTENERS
========================= */

function startNotesListener(){
    stopListeners();

    const q = query(collection(db, "notes"), orderBy("createdAt", "desc"));

    state.unsubNotes = onSnapshot(q, function(snap){

        state.notes = snap.docs.map(function(d){
            return Object.assign({ id: d.id }, d.data());
        });

        refreshView();

    }, function(e){
        console.error(e);
        alert("Could not load notes: " + authMessage(e));
    });
}

function stopListeners(){
    if(state.unsubNotes){
        state.unsubNotes();
        state.unsubNotes = null;
    }

    Object.keys(state.commentUnsubs).forEach(function(id){
        state.commentUnsubs[id]();
    });

    state.commentUnsubs = {};
    state.commentCache = {};
}


/* =========================
   NAVIGATION
========================= */

function goHome(){
    state.branchKey = null;
    state.subject = null;

    showPage("homePage");
    renderHome();
}

function scrollBranches(){
    if(state.page !== "homePage"){
        goHome();
    }

    $("branchHeading").scrollIntoView({ behavior:"smooth" });
}

function openBranch(key){
    state.branchKey = key;
    state.subject = null;

    showPage("branchPage");
    renderBranch();
}

function openSubject(index){
    const branch = getBranch(state.branchKey);

    state.subject = branch.subjects[index];

    showPage("subjectPage");
    renderSubject();
}

function goBackToBranch(){
    state.subject = null;

    showPage("branchPage");
    renderBranch();
}


/* =========================
   RENDER
========================= */

function renderHome(){
    let html = "";

    BRANCHES.forEach(function(b){
        const count = state.notes.filter(function(n){
            return n.branch === b.key;
        }).length;

        html +=
            '<div class="branch" onclick="openBranch(\'' + b.key + '\')">' +
                '<div class="branch-icon" style="background:' + b.color + '">' + safe(b.icon) + '</div>' +
                '<h3>' + safe(b.name) + '</h3>' +
                '<p>' + b.subjects.length + ' Subjects &bull; ' + count + ' Notes</p>' +
            '</div>';
    });

    $("branchGrid").innerHTML = html;

    const latest = state.notes.slice(0, 6);

    $("latestNotes").innerHTML = latest.length
        ? latest.map(noteHTML).join("")
        : '<div class="empty">No notes uploaded yet. Be the first to upload one.</div>';
}

function renderBranch(){
    const branch = getBranch(state.branchKey);

    $("branchTitle").innerText = branch.name + " Subjects";

    let html = "";

    branch.subjects.forEach(function(s, i){
        const count = state.notes.filter(function(n){
            return n.branch === branch.key && n.subject === s;
        }).length;

        html +=
            '<div class="subject" onclick="openSubject(' + i + ')">' +
                '<div class="subject-icon" style="background:' + branch.color + '">' +
                    safe(s.charAt(0)) +
                '</div>' +
                '<h3>' + safe(s) + '</h3>' +
                '<p>' + count + ' Notes</p>' +
            '</div>';
    });

    $("subjectGrid").innerHTML = html;
}

function renderSubject(){
    const branch = getBranch(state.branchKey);

    $("subjectTitle").innerText = state.subject + " Notes (" + branch.name + ")";

    const notes = state.notes.filter(function(n){
        return n.branch === state.branchKey && n.subject === state.subject;
    });

    $("subjectNotes").innerHTML = notes.length
        ? notes.map(noteHTML).join("")
        : '<div class="empty">No notes in this subject yet. Use Upload Notes to add the first one.</div>';
}

function refreshView(){
    // comment box mein likha hua text na ud jaye
    const saved = {};

    document.querySelectorAll(".comment-form input").forEach(function(i){
        saved[i.id] = i.value;
    });

    const activeId = document.activeElement ? document.activeElement.id : "";

    if(state.page === "homePage"){
        renderHome();
    }else if(state.page === "branchPage"){
        renderBranch();
    }else if(state.page === "subjectPage"){
        renderSubject();
    }

    Object.keys(saved).forEach(function(id){
        const el = $(id);
        if(el){ el.value = saved[id]; }
    });

    if(activeId && $(activeId)){
        $(activeId).focus();
    }
}


/* =========================
   NOTE CARD + COMMENTS
========================= */

function formatDate(ts){
    if(ts && ts.toDate){
        return ts.toDate().toLocaleDateString();
    }
    return "just now";
}

function commentListHTML(noteId){
    const list = state.commentCache[noteId];

    if(!list){
        return '<div class="no-comments">Loading comments...</div>';
    }

    if(list.length === 0){
        return '<div class="no-comments">No comments yet. Share a tip or ask a doubt.</div>';
    }

    return list.map(function(c){
        const time = (c.createdAt && c.createdAt.toDate)
            ? c.createdAt.toDate().toLocaleString()
            : "just now";

        return '<div class="comment">' +
            '<b>' + safe(c.name) + '</b><br>' +
            safe(c.text) +
            '<small>' + safe(time) + '</small>' +
        '</div>';
    }).join("");
}

function noteHTML(note){
    const branch = getBranch(note.branch);
    const id = safe(note.id);
    const isOpen = openComments.has(note.id);
    const mine = state.user && note.uploaderUid === state.user.uid;

    let commentsHTML = "";

    if(isOpen){
        commentsHTML =
            '<div class="comments">' +
                '<div class="comment-list" id="clist-' + id + '">' +
                    commentListHTML(note.id) +
                '</div>' +
                '<div class="comment-form">' +
                    '<input id="cin-' + id + '" type="text" maxlength="300" ' +
                        'placeholder="Write a comment..." ' +
                        'onkeydown="if(event.key===\'Enter\'){addComment(\'' + id + '\')}">' +
                    '<button onclick="addComment(\'' + id + '\')">Post</button>' +
                '</div>' +
            '</div>';
    }

    return '' +
        '<div class="note">' +
            '<h3>' + safe(note.name) + '</h3>' +
            '<div class="subject-name">' +
                safe(branch ? branch.name : note.branch) + ' &rsaquo; ' + safe(note.subject) +
            '</div>' +
            '<small>' +
                'Course: ' + safe(note.course) +
                (note.semester ? ' (' + safe(note.semester) + ')' : '') + '<br>' +
                'Uploaded by: ' + safe(note.uploader) + '<br>' +
                'Date: ' + safe(formatDate(note.createdAt)) +
            '</small>' +
            '<div class="note-actions">' +
                '<button class="view" onclick="viewNote(\'' + id + '\')">View Note</button>' +
                '<button class="comment-toggle" onclick="toggleComments(\'' + id + '\')">💬 Comments</button>' +
                (mine ? '<button class="delete-note" onclick="deleteNote(\'' + id + '\')">🗑 Delete</button>' : '') +
            '</div>' +
            commentsHTML +
        '</div>';
}

function toggleComments(id){
    if(openComments.has(id)){
        openComments.delete(id);

        if(state.commentUnsubs[id]){
            state.commentUnsubs[id]();
            delete state.commentUnsubs[id];
        }

        refreshView();
        return;
    }

    openComments.add(id);
    refreshView();

    const q = query(
        collection(db, "notes", id, "comments"),
        orderBy("createdAt", "asc")
    );

    state.commentUnsubs[id] = onSnapshot(q, function(snap){

        state.commentCache[id] = snap.docs.map(function(d){
            return Object.assign({ id: d.id }, d.data());
        });

        const box = $("clist-" + id);

        if(box){
            box.innerHTML = commentListHTML(id);
            box.scrollTop = box.scrollHeight;
        }

    }, function(e){
        console.error(e);
    });

    const input = $("cin-" + id);
    if(input){ input.focus(); }
}

async function addComment(id){
    const input = $("cin-" + id);
    const text = input.value.trim();

    if(!text){
        return;
    }

    input.disabled = true;

    try{
        await addDoc(collection(db, "notes", id, "comments"), {
            uid: state.user.uid,
            name: state.user.name,
            text: text,
            createdAt: serverTimestamp()
        });

        input.value = "";
    }catch(e){
        alert("Could not post comment: " + authMessage(e));
    }finally{
        input.disabled = false;
        input.focus();
    }
}

async function deleteNote(id){
    const note = state.notes.find(function(n){ return n.id === id; });

    if(!note){
        return;
    }

    if(!state.user || note.uploaderUid !== state.user.uid){
        alert("You can delete only the notes uploaded by you.");
        return;
    }

    if(!confirm('Delete "' + note.name + '"? This cannot be undone.')){
        return;
    }

    try{
        // pehle comments hatao, phir note
        const comments = await getDocs(collection(db, "notes", id, "comments"));

        for(const c of comments.docs){
            await deleteDoc(c.ref);
        }

        await deleteDoc(doc(db, "notes", id));

        if(state.commentUnsubs[id]){
            state.commentUnsubs[id]();
            delete state.commentUnsubs[id];
        }

        openComments.delete(id);

    }catch(e){
        alert("Could not delete: " + authMessage(e));
    }
}


/* =========================
   UPLOAD
========================= */

function openUpload(){
    $("noteUploader").value = state.user ? state.user.name : "";

    $("noteBranch").value = state.branchKey || (state.user ? state.user.branch : "");
    fillSubjectSelect();

    if(state.subject){
        $("noteSubject").value = state.subject;
    }

    $("uploadModal").style.display = "flex";
}

function closeUpload(){
    $("uploadModal").style.display = "none";
}

function fillSubjectSelect(){
    const branch = getBranch($("noteBranch").value);

    let html = '<option value="">Select Subject</option>';

    if(branch){
        branch.subjects.forEach(function(s){
            html += '<option value="' + safe(s) + '">' + safe(s) + '</option>';
        });
    }

    $("noteSubject").innerHTML = html;
}

function fileSelected(input){
    const file = input.files[0];

    if(!file){
        return;
    }

    if(input.id === "camera"){ $("pdf").value = ""; }
    if(input.id === "pdf"){ $("camera").value = ""; }

    $("fileText").innerText = "Selected: " + file.name;

    if(file.type.startsWith("image/")){
        const reader = new FileReader();

        reader.onload = function(e){
            $("preview").src = e.target.result;
            $("preview").style.display = "block";
        };

        reader.readAsDataURL(file);
    }else{
        $("preview").style.display = "none";
    }
}

async function uploadToCloudinary(file){
    const fd = new FormData();

    fd.append("file", file);
    fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(
        "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/auto/upload",
        { method: "POST", body: fd }
    );

    const data = await res.json();

    if(!res.ok){
        throw new Error(
            data.error && data.error.message ? data.error.message : "File upload failed"
        );
    }

    return data;
}

async function uploadNote(){
    const name     = $("noteName").value.trim();
    const branch   = $("noteBranch").value;
    const subject  = $("noteSubject").value;
    const course   = $("noteCourse").value.trim();
    const semester = $("noteSemester").value;
    const uploader = $("noteUploader").value.trim();

    const file = $("camera").files[0] || $("pdf").files[0];

    if(!name){ alert("Please enter the note title."); return; }
    if(!branch){ alert("Please select a branch."); return; }
    if(!subject){ alert("Please select a subject."); return; }
    if(!course){ alert("Please enter the course (e.g. B.Tech)."); return; }
    if(!uploader){ alert("Please enter your name."); return; }
    if(!file){ alert("Please select a PDF or take a photo."); return; }

    if(file.size > 10 * 1024 * 1024){
        alert("File is too large (max 10 MB).");
        return;
    }

    const btn = $("uploadBtn");
    btn.disabled = true;
    btn.innerText = "Uploading...";

    try{
        const uploaded = await uploadToCloudinary(file);

        await addDoc(collection(db, "notes"), {
            name: name,
            branch: branch,
            subject: subject,
            course: course,
            semester: semester,
            uploader: uploader,
            uploaderUid: state.user.uid,
            fileName: file.name,
            fileType: file.type,
            fileUrl: uploaded.secure_url,
            createdAt: serverTimestamp()
        });

        alert("Note uploaded successfully!");

        $("noteName").value = "";
        $("noteSemester").value = "";
        $("camera").value = "";
        $("pdf").value = "";
        $("fileText").innerText = "";
        $("preview").style.display = "none";

        closeUpload();

    }catch(e){
        alert("Upload failed: " + authMessage(e));
    }finally{
        btn.disabled = false;
        btn.innerText = "Upload Note";
    }
}


/* =========================
   VIEW NOTE
========================= */

function viewNote(id){
    const note = state.notes.find(function(n){ return n.id === id; });

    if(!note || !note.fileUrl){
        alert("File not found.");
        return;
    }

    window.open(note.fileUrl, "_blank", "noopener");
}


/* =========================
   MAKE FUNCTIONS AVAILABLE TO HTML onclick
========================= */

Object.assign(window, {
    loginStep1, registerStudent, verifyOtp, resendOtp, cancelOtp,
    showPanel, goHome, scrollBranches, logout,
    openBranch, openSubject, goBackToBranch,
    openUpload, closeUpload, fillSubjectSelect, fileSelected, uploadNote,
    viewNote, toggleComments, addComment, deleteNote
});


/* =========================
   START
========================= */

fillBranchSelects();
showPanel("loginPanel");