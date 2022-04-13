const rows = document.querySelectorAll('.row');
const keys = document.querySelectorAll('.key');
const enter = document.querySelector('#enter');
const del = document.querySelector('#delete');
const resetRow = document.querySelector('#reset-row');
const resetBoard = document.querySelector('#reset-board');
const getWords = document.querySelector('#get-words');
const wordbox = document.querySelector('#wordbox');
const badInput = document.querySelector('.bad-input');
const openInstructions = document.querySelector('.instructions-open');
const closeInstructions = document.querySelector('.close-instructions');
const instructions = document.querySelector('.instructions');



function change_tile_state({target}){
    if (target.classList.length < 2 || (target.classList.length == 2 && target.classList.contains('focus'))) {
        target.classList.add('absent');
    } else if (target.classList.contains('absent')) {
        target.classList.remove('absent');
        target.classList.add('present');
    } else if (target.classList.contains('present')) {
        target.classList.remove('present');
        target.classList.add('correct');
    } else if (target.classList.contains('correct')) {
        target.classList.remove('correct');
        target.classList.add('absent');
    }
}

function activate_row(row) {
    for(let tile of row) {
        tile.addEventListener('click', change_tile_state);
    }
}
function deactivate_row(row) {
    for(let tile of row) {
        tile.removeEventListener('click', change_tile_state);
        tile.classList.remove('focus');
    }
}

function verify_row(row) {
    for(let tile of row){
        if(!tile.innerHTML || tile.classList.length < 2) {
            return false;
        }
    }
    return true;
}

function clear_row(row) {
    for(let tile of row) {
        tile.classList.remove('correct');
        tile.classList.remove('present');
        tile.classList.remove('absent');
        tile.classList.remove('focus');
        tile.innerHTML = '';
    }
}


function gather_hints(row) {
    let hints = {"correct":['.', '.', '.', '.', '.'],
                 "present":['.', '.', '.', '.', '.'],
                  "absent":['.', '.', '.', '.', '.']};
    for(let i = 0; i < 5; i++) {
        let tile = row[i];
        if (tile.classList.contains('correct')) {
            hints.correct[i] = tile.innerHTML;
        } else if (tile.classList.contains('present')) {
            hints.present[i] = tile.innerHTML;
        } else if(tile.classList.contains('absent')) {
            hints.absent[i] = tile.innerHTML;
        }
    }
    return hints;
}


function split_pattern(pattern){
    // Splits a pattern "T..K." --> "T....", "...K."
    // Returns an array with regular expressions
    regex_literals = [];
    empty = ['.','.','.','.','.'];
    for(let i = 0; i < pattern.length; i++){
        if(pattern[i] !== '.'){
            empty[i] = pattern[i]
            let re = new RegExp(empty.join(''))
            empty = empty = ['.','.','.','.','.'];
            regex_literals.push(re)
        }
    }
    return regex_literals;
}

function create_dump_pattern(letter, index_in_green){
    //  Green: "TEA..", GREY: "...SE", 'E' is both in green and in grey
    // I need E.EEE to split it into E...., ..E.., ...E., ....E
    dump = ['.','.','.','.','.'];
    for(let i = 0; i < dump.length; i++){
        if (i !== index_in_green) {
            dump[i] = letter;
        }
    } 
    return dump;
}

function join_pattern(existing, add_to_existing) {
    // "A...." + "..K.T" --> "A.K.T"
    for(let i = 0; i < existing.length; i++) {
        if(existing[i] !== add_to_existing[i] && add_to_existing[i] !== '.'){
            existing[i] = add_to_existing[i]
        }
    }
    return existing;
}

function contains_all(word, letters_array) {
    arr = []
    letters_array.forEach(letter => {
        arr.push(word.includes(letter))
    })
    return !arr.includes(false)
}
function contains_none(word, letters_array) {
    arr = []
    letters_array.forEach(letter => {
        arr.push(word.includes(letter))
    })
    return !arr.includes(true)
}

function matches_none(word, regex_array) {
    // Checks if a word matches none of the patterns in an array
    arr = []
    regex_array.forEach(pattern => {
        arr.push(pattern.test(word))
    })
    return !arr.includes(true)
}

function count_appearances(letter, arr) {
    let appearance = 0;
    arr.forEach(index=>{
        if(index===letter){
            appearance++;
        }
    })
    return appearance;
}

function next_row() {
    if(verify_row(current_row) && row_tracker < 4) {
        deactivate_row(current_row);
        row_tracker++;
        tile_tracker = 0;
        current_row = rows[row_tracker].children;
        activate_row(current_row);
        current_row[tile_tracker].classList.add('focus');
    } else if(row_tracker == 4) {
        deactivate_row(current_row);
        row_tracker++;
    }
    else {
        badInput.classList.remove('hidden');
    }
}

function add_to_present(correct_pattern, present_pattern, dict) {
    let dict_keys = []
    for (const [key, value] of Object.entries(dict)){
        dict_keys.push(key);
    }
    for(let letter of correct_pattern) {
        if (letter !== '.') {
            dict[`${letter}`] = count_appearances(letter, correct_pattern);
        }
    }
    for(let letter of present_pattern) {
        if (letter !== '.') {
            if(!dict_keys.includes(letter)) {
                dict[`${letter}`] = count_appearances(letter, present_pattern);
            }
            if (correct_pattern.includes(letter)) {
                dict[`${letter}`]++;
            }
        }
    }
    return dict
}

function add_to_absent(absent_arr, correct_pattern, present_letters, present_patterns, absent_letters) {
    let present_letters_key = []
    for (const [key, value] of Object.entries(present_letters)){
        present_letters_key.push(key);
    }

    for (let letter of absent_arr) {
        if(letter !== '.') {
            if (!absent_letters.includes(letter)) {
                if(!correct_pattern.includes(letter) && !present_letters_key.includes(letter)) {
                    absent_letters.push(letter);
                }
                if(correct_pattern.includes(letter)) {
                    present_patterns.push(...split_pattern(create_dump_pattern(letter, correct_pattern.indexOf(letter))));
                }
            }
        }
    }

    return absent_letters;
}

function check_appearances(word, present_letters) {
    let word_arr = word.split('');
    for (const [letter, appearances] of Object.entries(present_letters)){
        if(word_arr.includes(letter)) {
            if(count_appearances(letter, word_arr) < appearances) {
                return false;
            } else {
                return true;
            }
        } else if(!word_arr.includes(letter)) {
            return false;
        }
    }
    return true;
}

function find_matching_words(correct_pattern, present_letters, present_patterns, absent_letters) {
    let present_letters_key = []
    for (const [key, value] of Object.entries(present_letters)){
        present_letters_key.push(key);
    }
    let correct_regex = new RegExp(correct_pattern.join('')) 
    for (let word of words) {
        if(correct_regex.test(word) &&
            contains_all(word, present_letters_key) &&
            contains_none(word, absent_letters) &&
            matches_none(word, present_patterns) &&
            check_appearances(word,present_letters)) {
                wordbox.innerHTML += `<span class='word'>${word}</span>`
            }
    }
}


openInstructions.addEventListener('click', function() {
    instructions.classList.remove('hidden');
})

closeInstructions.addEventListener('click', function() {
    instructions.classList.add('hidden');
})




let row_tracker = 0;
let tile_tracker = 0;

let current_row = rows[row_tracker].children;
current_row[0].classList.add('focus');
activate_row(current_row);

keys.forEach(function(key) {
    key.addEventListener('click',function(){
        if(tile_tracker < 5) {
            let current_tile = current_row[tile_tracker];
            let next_tile = current_row[tile_tracker+1];
            current_tile.innerHTML = key.innerHTML;

            // Automatically color tiles
            if(correct_pattern.includes(key.innerHTML)) {
                current_tile.classList.add('correct');
            } else if(Object.keys(present_letters).includes(key.innerHTML)) {
                current_tile.classList.add('present');
            }

            if(tile_tracker < 4) {
                current_tile.classList.remove('focus');
            }

            tile_tracker++;
            if(tile_tracker < 5) {
                next_tile.classList.add('focus');
            }
        }
    })
})

del.addEventListener('click', function(){ 
    if(tile_tracker > 0) {
        tile_tracker--;
        current_row[tile_tracker].innerHTML = '';
        current_row[tile_tracker].classList.remove('correct');
        current_row[tile_tracker].classList.remove('present');
        current_row[tile_tracker].classList.remove('abesnt');

        current_row[tile_tracker].classList.add('focus');

        if(tile_tracker < 4) {
            current_row[tile_tracker+1].classList.remove('focus');
        }
        if(tile_tracker === -1) {
            tile_tracker = 0;
        }
    }
})

enter.addEventListener('click', next_row)

resetBoard.addEventListener('click', function() {
    correct_pattern = ['.', '.', '.', '.', '.'];
    present_letters = {}
    present_patterns = []
    absent_letters = []
    wordbox.innerHTML = '';
    if(row_tracker == 5) {
        row_tracker = 4;
    }
    for(let i = row_tracker; i >= 0; i--) {
        for(let cell of rows[i].children){
            cell.innerHTML = '';
            cell.classList.remove('correct');
            cell.classList.remove('present');
            cell.classList.remove('absent');
        }
        deactivate_row(rows[i].children);
    }
    tile_tracker = 0;
    row_tracker = 0;
    current_row = rows[row_tracker].children;
    current_row[tile_tracker].classList.add('focus');
    activate_row(current_row);


})

badInput.addEventListener('click', function() {
    badInput.classList.add('hidden');
})

// Get words
let correct_pattern = ['.', '.', '.', '.', '.'];
let present_letters = {}
let present_patterns = []
let absent_letters = []


getWords.addEventListener('click', function(){
    if(verify_row(current_row) && row_tracker <= 4) {
        console.log('in?');
        wordbox.innerHTML = '';
        next_row();
        for(let row = 0; row < row_tracker; row++) {
            let row_to_check = rows[row].children
            let hints = gather_hints(row_to_check);
            correct_pattern = join_pattern(correct_pattern, hints.correct);
            present_letters = add_to_present(correct_pattern, hints.present, present_letters);
            present_patterns.push(...split_pattern(hints.present));
            absent_letters = add_to_absent(hints.absent, correct_pattern, present_letters, present_patterns, absent_letters);
            
        }
        find_matching_words(correct_pattern, present_letters, present_patterns, absent_letters);


        const matchingWords = document.querySelectorAll('.word');
        matchingWords.forEach((word)=> word.addEventListener('click', function() {
            for(let tile of current_row) {
                tile.classList.remove('present');
                tile.classList.remove('correct');
                tile.classList.remove('absent');
            }
            for(let i = 0; i < 5; i++) {
                current_row[i].innerHTML = word.innerHTML[i];
                current_row[i].classList.remove('focus');
                if(correct_pattern.includes(word.innerHTML[i])) {
                    current_row[i].classList.add('correct');
                } else if(Object.keys(present_letters).includes(word.innerHTML[i])) {
                    current_row[i].classList.add('present');
                }
            }
            current_row[current_row.length-1].classList.add('focus');
            tile_tracker = current_row.length;
        }))


    }
    else {
        badInput.classList.remove('hidden');
    }
})



