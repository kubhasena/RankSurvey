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

// --- Films to rank ---
var images = [
  { src: "images/Annatthe.png", label: "Annatthe" },
  { src: "images/Bahubali.png", label: "Bahubali" },
  { src: "images/Dashavataram.png", label: "Dashavataram" },
  { src: "images/Enthiran.png", label: "Enthiran" },
  { src: "images/KGF.png", label: "KGF" },
  { src: "images/Mankatha.png", label: "Mankatha" },
  { src: "images/Panchathanthiram.png", label: "Panchathanthiram" },
  { src: "images/Petta.png", label: "Petta" },
  { src: "images/RRR.png", label: "RRR" },
  { src: "images/Thuppakki.png", label: "Thuppakki" },
  { src: "images/Vishwaroopam.png", label: "Vishwaroopam" }
];

// --- UI Elements ---
var welcomeScreen = document.getElementById('welcome-screen');
var surveyScreen = document.getElementById('survey-screen');
var finishScreen = document.getElementById('finish-screen');
var resultsScreen = document.getElementById('results-screen');
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
  var state = {
    mergeStack: [],
    sortedArrays: {},
    currentMerge: null,
    totalEstimatedComparisons: Math.ceil(indices.length * Math.log2(indices.length)),
    completedComparisons: 0,
    nextArrayId: 0
  };
  
  // Initialize with single-element arrays
  for (var i = 0; i < indices.length; i++) {
    state.sortedArrays[state.nextArrayId] = [indices[i]];
    state.nextArrayId++;
  }
  
  // Build merge operations bottom-up
  buildMergeStack(state, indices.length);
  
  console.log('Mergesort initialized with', state.mergeStack.length, 'merge operations');
  return state;
}

function buildMergeStack(state, n) {
  var currentLevel = [];
  
  // Start with single element array IDs
  for (var i = 0; i < n; i++) {
    currentLevel.push(i);
  }
  
  while (currentLevel.length > 1) {
    var nextLevel = [];
    
    // Pair up arrays for merging
    for (var i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        // Create merge operation
        var merge = {
          leftId: currentLevel[i],
          rightId: currentLevel[i + 1],
          resultId: state.nextArrayId,
          leftIndex: 0,
          rightIndex: 0,
          result: []
        };
        state.mergeStack.push(merge);
        nextLevel.push(state.nextArrayId);
        state.nextArrayId++;
      } else {
        // Odd one out, promote to next level
        nextLevel.push(currentLevel[i]);
      }
    }
    
    currentLevel = nextLevel;
  }
}

function updateProgressBar() {
  var state = mergesortState;
  if (!state) return;
  var total = state.totalEstimatedComparisons;
  var done = state.completedComparisons;
  var percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  var bar = document.getElementById('progress-bar');
  if (bar) bar.style.width = percent + '%';
}

function showNextPair() {
  var state = mergesortState;
  updateProgressBar();
  
  var comparison = getNextComparison(state);
  
  if (comparison === null) {
    // Mergesort complete! Get final ranking
    var finalArrayId = Math.max.apply(Math, Object.keys(state.sortedArrays).map(Number));
    finalRanking = state.sortedArrays[finalArrayId];
    finishSurvey();
  } else {
    // Show user the comparison
    showPair(comparison.elementA, comparison.elementB, state);
  }
}

function showPair(idxA, idxB, state) {
  console.log('Comparing:', images[idxA].label, 'vs', images[idxB].label);
  pairContainer.innerHTML =
    '<div class="image-pair-row">' +
      '<div class="image-item selectable" id="imgA">' +
        '<img src="' + images[idxA].src + '" alt="Film A">' +
        '<div class="film-label">' + images[idxA].label + '</div>' +
      '</div>' +
      '<div class="image-item selectable" id="imgB">' +
        '<img src="' + images[idxB].src + '" alt="Film B">' +
        '<div class="film-label">' + images[idxB].label + '</div>' +
      '</div>' +
    '</div>';
  nextBtn.style.display = 'none';
  var imgA = document.getElementById('imgA');
  var imgB = document.getElementById('imgB');
  function selectImage(selectedIdx, selectedElem, otherElem) {
    selectedElem.classList.add('selected');
    otherElem.classList.remove('selected');
    setTimeout(function() {
      // Process the comparison result
      var userChoseA = (selectedIdx === idxA);
      processComparison(state, idxA, idxB, userChoseA);
      showNextPair();
    }, 250); // short delay for feedback
  }
  imgA.onclick = function() { selectImage(idxA, imgA, imgB); };
  imgB.onclick = function() { selectImage(idxB, imgB, imgA); };
}

// No longer needed - we get final ranking directly from mergesort
// function buildRankingFromResults(results, n) {
//   // Simple ranking: count wins for each image
//   var counts = Array(n).fill(0);
//   for (var i = 0; i < results.length; i++) {
//     counts[results[i]]++;
//   }
//   // Sort images by win count descending
//   var ranking = Array.from(Array(n).keys()).sort(function(a, b) {
//     return counts[b] - counts[a];
//   });
//   return ranking;
// }

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
    var gender = demographicForm.gender.value || null; // Now optional
    var country = demographicForm.country.value || null;
    var data = {
      age: age,
      ethnicity: ethnicity,
      gender: gender,
      country: country
    };
    var statusDiv = document.getElementById('demographic-status');
    if (window.lastRankingDoc) {
      statusDiv.textContent = 'Submitting...';
      window.lastRankingDoc.update({ demographics: data })
        .then(function() {
          showResultsScreen();
        })
        .catch(function() {
          statusDiv.textContent = 'Error submitting demographic info.';
        });
    } else {
      statusDiv.textContent = 'Ranking not found. Please refresh and try again.';
    }
  };
}

function showResultsScreen() {
  finishScreen.style.display = 'none';
  resultsScreen.style.display = '';
  
  var rankingsDisplay = document.getElementById('rankings-display');
  var rankingHTML = '';
  
  for (var i = 0; i < finalRanking.length; i++) {
    var filmIdx = finalRanking[i];
    var film = images[filmIdx];
    var rankNum = i + 1;
    var isTop3 = rankNum <= 3 ? 'top-3' : '';
    
    rankingHTML += 
      '<div class="ranking-item">' +
        '<div class="rank-number ' + isTop3 + '">' + rankNum + '</div>' +
        '<img src="' + film.src + '" alt="' + film.label + '" class="rank-poster">' +
        '<div class="rank-details">' +
          '<div class="rank-title">' + film.label + '</div>' +
          '<div class="rank-position">' + getPositionText(rankNum) + '</div>' +
        '</div>' +
      '</div>';
  }
  
  rankingsDisplay.innerHTML = rankingHTML;
}

function getPositionText(rank) {
  if (rank === 1) return '1st Place';
  if (rank === 2) return '2nd Place'; 
  if (rank === 3) return '3rd Place';
  return rank + 'th Place';
}

// Gender selection handling
document.addEventListener('DOMContentLoaded', function() {
  var genderOptions = document.querySelectorAll('.gender-option');
  var genderInput = document.querySelector('input[name="gender"]');
  
  genderOptions.forEach(function(option) {
    option.addEventListener('click', function() {
      // Remove selected class from all options
      genderOptions.forEach(function(opt) {
        opt.classList.remove('selected');
      });
      
      // Add selected class to clicked option
      this.classList.add('selected');
      
      // Update hidden input value
      genderInput.value = this.getAttribute('data-value');
    });
  });
});

// Get next comparison needed
function getNextComparison(state) {
  // If no current merge, start next one from stack
  if (state.currentMerge === null) {
    if (state.mergeStack.length === 0) {
      return null; // All done!
    }
    state.currentMerge = state.mergeStack.shift(); // Take from front (FIFO)
  }
  
  var merge = state.currentMerge;
  var leftArray = state.sortedArrays[merge.leftId];
  var rightArray = state.sortedArrays[merge.rightId];
  
  // Check if merge is complete
  if (merge.leftIndex >= leftArray.length) {
    // Copy remaining from right
    while (merge.rightIndex < rightArray.length) {
      merge.result.push(rightArray[merge.rightIndex]);
      merge.rightIndex++;
    }
    finishMerge(state, merge);
    return getNextComparison(state); // Get next
  }
  
  if (merge.rightIndex >= rightArray.length) {
    // Copy remaining from left
    while (merge.leftIndex < leftArray.length) {
      merge.result.push(leftArray[merge.leftIndex]);
      merge.leftIndex++;
    }
    finishMerge(state, merge);
    return getNextComparison(state); // Get next
  }
  
  // Need user comparison
  return {
    elementA: leftArray[merge.leftIndex],
    elementB: rightArray[merge.rightIndex]
  };
}

// Process user's comparison result
function processComparison(state, elementA, elementB, userChoseA) {
  var merge = state.currentMerge;
  var leftArray = state.sortedArrays[merge.leftId];
  var rightArray = state.sortedArrays[merge.rightId];
  
  if (userChoseA) {
    // User preferred left element
    merge.result.push(leftArray[merge.leftIndex]);
    merge.leftIndex++;
  } else {
    // User preferred right element
    merge.result.push(rightArray[merge.rightIndex]);
    merge.rightIndex++;
  }
  
  state.completedComparisons++;
}

// Finish a merge operation
function finishMerge(state, merge) {
  // Store the merged result
  state.sortedArrays[merge.resultId] = merge.result;
  
  // Clear current merge
  state.currentMerge = null;
  
  // Clean up old arrays to save memory
  delete state.sortedArrays[merge.leftId];
  delete state.sortedArrays[merge.rightId];
}
