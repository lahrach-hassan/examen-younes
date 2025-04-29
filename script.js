class PlanningApp {
    constructor() {
        this.events = JSON.parse(localStorage.getItem('events')) || [];
        this.selectedEventId = null;
        this.initializeCalendar();
        this.initializeEventListeners();
        this.initializeNotifications();
        this.checkUpcomingEvents();
    }

    initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        this.renderCalendar(calendarEl);
    }

    initializeEventListeners() {
        document.getElementById('saveEvent').addEventListener('click', () => this.saveEvent());
        document.getElementById('completeEvent').addEventListener('click', () => this.completeEvent());
        document.getElementById('rescheduleEvent').addEventListener('click', () => this.rescheduleEvent());
        document.getElementById('deleteEvent').addEventListener('click', () => this.deleteEvent());
        
        // Limiter les dates du calendrier
        const dateInput = document.getElementById('date');
        dateInput.min = '2025-05-01';
        dateInput.max = '2025-05-28';
    }

    renderCalendar(container) {
        const startDate = new Date(2025, 4, 1); // 1er mai 2025
        const endDate = new Date(2025, 4, 28); // 28 mai 2025
        
        let calendarHTML = '<div class="row calendar-header">';
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        days.forEach(day => {
            calendarHTML += `<div class="col">${day}</div>`;
        });
        calendarHTML += '</div><div class="row">';

        // Ajouter les jours vides au début
        for (let i = 0; i < startDate.getDay(); i++) {
            calendarHTML += '<div class="col calendar-day"></div>';
        }

        // Ajouter les jours du mois
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            if (d.getDay() === 0 && d > startDate) {
                calendarHTML += '</div><div class="row">';
            }
            
            const dateStr = d.toISOString().split('T')[0];
            const dayEvents = this.events.filter(e => e.date === dateStr);
            
            calendarHTML += `
                <div class="col calendar-day">
                    <div class="day-number">${d.getDate()}</div>
                    ${dayEvents.map(event => this.renderEvent(event)).join('')}
                </div>
            `;
        }

        calendarHTML += '</div>';
        container.innerHTML = calendarHTML;

        // Ajouter les écouteurs d'événements pour les événements du calendrier
        document.querySelectorAll('.event').forEach(eventEl => {
            eventEl.addEventListener('click', (e) => {
                this.selectedEventId = e.target.dataset.eventId;
                new bootstrap.Modal(document.getElementById('statusModal')).show();
            });
        });

        // Add current-week class for mobile view
        const today = new Date();
        const rows = container.querySelectorAll('.row');
        rows.forEach((row, index) => {
            if (index === 0) return; // Skip header row
            row.classList.add('calendar-row');
            const firstDayInRow = row.querySelector('.calendar-day');
            const dayNumber = firstDayInRow.querySelector('.day-number');
            if (dayNumber) {
                const rowDate = new Date(2025, 4, parseInt(dayNumber.textContent));
                if (this.isSameWeek(rowDate, today)) {
                    row.classList.add('current-week');
                }
            }
        });
    }

    renderEvent(event) {
        const eventClass = this.getEventClass(event.subject);
        const completedClass = event.completed ? 'event-completed' : '';
        return `
            <div class="event ${eventClass} ${completedClass}" 
                data-event-id="${event.id}"
                data-topic="${event.topic}">
                ${event.subject}<br>
                ${event.startTime}<br>
                <small>${event.topic}</small>
            </div>
        `;
    }

    getEventClass(subject) {
        const classes = {
            'Mathématiques': 'event-math',
            'Physique Chimie': 'event-physique',
            'SVT': 'event-svt',
            'Philosophie': 'event-philo',
            'LV2': 'event-lv2'
        };
        return classes[subject] || '';
    }

    saveEvent() {
        const form = document.getElementById('eventForm');
        if (form.checkValidity()) {
            const event = {
                id: Date.now().toString(),
                subject: document.getElementById('subject').value,
                topic: document.getElementById('topic').value,
                description: document.getElementById('description').value,
                objectives: document.getElementById('objectives').value,
                date: document.getElementById('date').value,
                startTime: document.getElementById('startTime').value,
                duration: document.getElementById('duration').value,
                completed: false
            };

            this.events.push(event);
            this.saveToLocalStorage();
            this.initializeCalendar();
            bootstrap.Modal.getInstance(document.getElementById('eventModal')).hide();
        }
    }

    completeEvent() {
        const event = this.events.find(e => e.id === this.selectedEventId);
        if (event) {
            event.completed = true;
            this.saveToLocalStorage();
            this.initializeCalendar();
        }
        bootstrap.Modal.getInstance(document.getElementById('statusModal')).hide();
    }

    rescheduleEvent() {
        const event = this.events.find(e => e.id === this.selectedEventId);
        if (event) {
            document.getElementById('subject').value = event.subject;
            document.getElementById('topic').value = event.topic;
            document.getElementById('description').value = event.description;
            document.getElementById('objectives').value = event.objectives;
            document.getElementById('date').value = event.date;
            document.getElementById('startTime').value = event.startTime;
            document.getElementById('duration').value = event.duration;
            
            this.deleteEvent();
            bootstrap.Modal.getInstance(document.getElementById('statusModal')).hide();
            new bootstrap.Modal(document.getElementById('eventModal')).show();
        }
    }

    deleteEvent() {
        this.events = this.events.filter(e => e.id !== this.selectedEventId);
        this.saveToLocalStorage();
        this.initializeCalendar();
        bootstrap.Modal.getInstance(document.getElementById('statusModal')).hide();
    }

    saveToLocalStorage() {
        localStorage.setItem('events', JSON.stringify(this.events));
    }

    initializeNotifications() {
        // Check for notifications every minute
        setInterval(() => this.checkUpcomingEvents(), 60000);
        
        // Add event listener for add event button
        document.getElementById('addEvent').addEventListener('click', () => {
            new bootstrap.Modal(document.getElementById('eventModal')).show();
        });

        // Add mobile navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.showPreviousWeek();
        });
    }

    showPreviousWeek() {
        const rows = document.querySelectorAll('.calendar-row');
        rows.forEach(row => {
            if (row.classList.contains('d-none')) {
                row.classList.remove('d-none');
            } else {
                row.classList.add('d-none');
            }
        });
    }

    checkUpcomingEvents() {
        const now = new Date();
        const upcoming = this.events.filter(event => {
            const eventDate = new Date(event.date + 'T' + event.startTime);
            const timeDiff = eventDate - now;
            // Check if event is within next 30 minutes
            return timeDiff > 0 && timeDiff <= 30 * 60 * 1000;
        });

        upcoming.forEach(event => {
            this.showNotification(event);
        });
    }

    showNotification(event) {
        if (!('Notification' in window)) {
            return;
        }

        if (Notification.permission === 'granted') {
            new Notification('Rappel de révision', {
                body: `${event.subject} - ${event.topic} commence dans 30 minutes!`,
                icon: '/icon.png'
            });
        }
    }

    isSameWeek(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        const firstDayOfWeek = new Date(date1.getTime() - date1.getDay() * oneDay);
        const firstDayOfWeek2 = new Date(date2.getTime() - date2.getDay() * oneDay);
        return firstDayOfWeek.toDateString() === firstDayOfWeek2.toDateString();
    }
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    const app = new PlanningApp();
});