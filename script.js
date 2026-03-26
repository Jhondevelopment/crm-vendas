// Function to open the modal
function openLeadModal() {
    // Code to display modal
}

// Function to create a new card
function createNewCard(name, whatsapp) {
    const newCard = document.createElement('div');
    newCard.classList.add('lead-card');
    newCard.innerHTML = `<p>Name: ${name}</p><p>WhatsApp: ${whatsapp}</p>`;
    document.querySelector('#novos-column').appendChild(newCard);
    enableDragDrop(newCard); // Assuming you have a function to enable drag and drop
}

// Event listener for the "+" button
document.getElementById('add-lead-button').addEventListener('click', openLeadModal);

// Event listener for modal submission
document.getElementById('lead-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('lead-name').value;
    const whatsapp = document.getElementById('lead-whatsapp').value;
    createNewCard(name, whatsapp);
    // Close modal here
});