// --- Firebase config for your app ---
var firebaseConfig = {
  apiKey: "AIzaSyBkxJQXyhVWddbnSJyW9jk6gDKxSYr_tXA",
  authDomain: "rankdr-2a613.firebaseapp.com",
  projectId: "rankdr-2a613",
  storageBucket: "rankdr-2a613.appspot.com",
  messagingSenderId: "438338830861",
  appId: "1:438338830861:web:023af5fc3eb87b85b74b44"
};
firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();

// --- Images to rank (replace with your own images) ---
var images = [
  { src: "images/sample1.jpg", label: "Sample Image 1" },
  { src: "images/sample2.jpg", label: "Sample Image 2" },
  { src: "images/sample3.jpg", label: "Sample Image 3" }
];

// --- UI Elements ---
var welcomeScreen = document.getElementById('welcome-screen');
var surveyScreen = document.getElementById('survey-screen');
var finishScreen = document.getElementById('finish-screen');
var startBtn = document.getElementById('start-btn');
var pairContainer = document.getElementById('pair-container');
var nextBtn = document.getElementById('next-btn');
var statusDiv = document.getElementById('status');

// --- Mergesort logic for pairwise comparison ---
var mergesortState = null;
var finalRanking = null;

if (startBtn) {
  startBtn.onclick = startSurvey;
}

function startSurvey() {
  welcomeScreen.style.display = 'none';
  surveyScreen.style.display = '';
  statusDiv.textContent = '';
  mergesortState = createMergesortState(images.map(function(img, idx) { return idx; }));
  finalRanking = null;
  showNextPair();
}

function createMergesortState(indices) {
  // For n images, create a queue of comparisons for mergesort
  var queue = [];
  function buildComparisons(arr) {
    if (arr.length <= 1) return arr;
    if (arr.length === 2) {
      queue.push([arr[0], arr[1]]);
      return null; // result will be built by queue
    }
    var mid = Math.floor(arr.length / 2);
    var left = buildComparisons(arr.slice(0, mid));
    var right = buildComparisons(arr.slice(mid));
    // After left and right are sorted, merge them
    queue.push([arr.slice(0, mid), arr.slice(mid)]);
    return null;
  }
  buildComparisons(indices);
  // Flatten queue to pairs for user comparison
  var flatQueue = [];
  for (var i = 0; i < queue.length; i++) {
    var pair = queue[i];
    if (Array.isArray(pair[0]) && Array.isArray(pair[1])) {
      // Merge step: compare each left vs each right
      for (var l = 0; l < pair[0].length; l++) {
        for (var r = 0; r < pair[1].length; r++) {
          flatQueue.push([pair[0][l], pair[1][r]]);
        }
      }
    } else {
      flatQueue.push(pair);
    }
  }
  console.log('Comparison queue:', flatQueue);
  return { queue: flatQueue, results: [], index: 0 };
}

function showNextPair() {
  var state = mergesortState;
  if (state.index < state.queue.length) {
    var pair = state.queue[state.index];
    showPair(pair[0], pair[1], state);
  } else {
    // Build final ranking from results
    finalRanking = buildRankingFromResults(state.results, images.length);
    finishSurvey();
  }
}

function showPair(idxA, idxB, state) {
  console.log('Comparing:', images[idxA].label, 'vs', images[idxB].label);
  pairContainer.innerHTML =
    '<div class="image-pair-row">' +
      '<div class="image-item selectable" id="imgA">' +
        '<img src="' + images[idxA].src + '" alt="Image A">' +
      '</div>' +
      '<div class="image-item selectable" id="imgB">' +
        '<img src="' + images[idxB].src + '" alt="Image B">' +
      '</div>' +
    '</div>';
  nextBtn.style.display = 'none';
  var imgA = document.getElementById('imgA');
  var imgB = document.getElementById('imgB');
  function selectImage(selectedIdx, selectedElem, otherElem) {
    selectedElem.classList.add('selected');
    otherElem.classList.remove('selected');
    setTimeout(function() {
      state.results.push(selectedIdx);
      state.index++;
      showNextPair();
    }, 250); // short delay for feedback
  }
  imgA.onclick = function() { selectImage(idxA, imgA, imgB); };
  imgB.onclick = function() { selectImage(idxB, imgB, imgA); };
}

function buildRankingFromResults(results, n) {
  // Simple ranking: count wins for each image
  var counts = Array(n).fill(0);
  for (var i = 0; i < results.length; i++) {
    counts[results[i]]++;
  }
  // Sort images by win count descending
  var ranking = Array.from(Array(n).keys()).sort(function(a, b) {
    return counts[b] - counts[a];
  });
  return ranking;
}

function finishSurvey() {
  surveyScreen.style.display = 'none';
  finishScreen.style.display = '';
  var rankingLabels = finalRanking.map(function(idx) { return images[idx].label; });
  window.lastRankingDoc = null;
  var demographicForm = document.getElementById('demographic-form');
  var statusDiv = document.getElementById('demographic-status');
  if (demographicForm) {
    demographicForm.querySelector('button[type="submit"]').disabled = true;
    statusDiv.textContent = 'Saving your ranking...';
  }
  db.collection('rankings').add({
    timestamp: new Date().toISOString(),
    ranking: rankingLabels
  }).then(function(docRef) {
    window.lastRankingDoc = docRef;
    if (demographicForm) {
      demographicForm.querySelector('button[type="submit"]').disabled = false;
      statusDiv.textContent = '';
    }
  }).catch(function() {
    if (demographicForm) {
      statusDiv.textContent = 'Error saving ranking. Please refresh and try again.';
    }
  });
}

// Demographic form submission
var demographicForm = document.getElementById('demographic-form');
if (demographicForm) {
  demographicForm.onsubmit = function(e) {
    e.preventDefault();
    var age = demographicForm.age.value || null;
    var ethnicity = demographicForm.ethnicity.value || null;
    var gender = demographicForm.gender.value || null;
    var country = demographicForm.country.value || null;
    var data = {
      age: age,
      ethnicity: ethnicity,
      gender: gender,
      country: country
    };
    var statusDiv = document.getElementById('demographic-status');
    if (window.lastRankingDoc) {
      window.lastRankingDoc.update({ demographics: data })
        .then(function() {
          statusDiv.textContent = 'Your submission has been received. Thank you!';
        })
        .catch(function() {
          statusDiv.textContent = 'Error submitting demographic info.';
        });
    } else {
      statusDiv.textContent = 'Ranking not found. Please refresh and try again.';
    }
  };
}
