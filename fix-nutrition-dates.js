// Script to add year to nutrition dates in the exported JSON
// Run this in browser console or with Node.js

const fs = require('fs');

// Read the exported file
const data = JSON.parse(fs.readFileSync('C:/Users/thoma/Downloads/diary-2026-07-24.json', 'utf8'));

// Get current year from workouts or use 2026
const currentYear = data.workouts && data.workouts.length > 0 
    ? data.workouts[0].date.split('-')[0] 
    : '2026';

console.log(`Adding year ${currentYear} to nutrition dates...`);

// Fix all week dates
if (data.nutrition && data.nutrition.weeks) {
    data.nutrition.weeks.forEach(week => {
        // Fix startDate and endDate
        if (week.startDate && !week.startDate.includes('-')) {
            week.startDate = `${currentYear}-${week.startDate.padStart(5, '0')}`;
        }
        if (week.endDate && !week.endDate.includes('-')) {
            week.endDate = `${currentYear}-${week.endDate.padStart(5, '0')}`;
        }
        
        // Fix all menu dates
        if (week.menu) {
            week.menu.forEach(day => {
                if (day.date && !day.date.includes('-')) {
                    // Convert "20.07" to "2026-07-20"
                    const [dayNum, month] = day.date.split('.');
                    day.date = `${currentYear}-${month.padStart(2, '0')}-${dayNum.padStart(2, '0')}`;
                }
            });
        }
    });
}

// Save the fixed file
fs.writeFileSync('C:/Users/thoma/Downloads/diary-fixed.json', JSON.stringify(data, null, 2), 'utf8');
console.log('✅ Fixed file saved to: C:/Users/thoma/Downloads/diary-fixed.json');
console.log('You can now import this file back into the app.');