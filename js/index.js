// Generate random room ID
function randomId() {
    return Math.random().toString(36).slice(2, 10);
}

// Generate random secure token
function randomToken(length = 24) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(36).padStart(2, '0')).join('').slice(0, length);
}

// Create invitation URL with room and token
function createInviteUrl(room, token) {
    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/[^/]*$/, 'chat.html');
    url.searchParams.set('room', room);
    url.searchParams.set('token', token);
    return url.toString();
}

// Copy text to clipboard
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const input = document.getElementById('inviteLink');
            input.select();
            document.execCommand('copy');
            return true;
        }
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
}

// Show copy confirmation message
function showCopyConfirmation() {
    const copyMessage = document.getElementById('copyMessage');
    copyMessage.classList.remove('hidden');
    setTimeout(() => {
        copyMessage.classList.add('hidden');
    }, 2000);
}

// Generate new invitation and display
function generateInvitation() {
    const room = randomId();
    const token = randomToken();
    const inviteUrl = createInviteUrl(room, token);
    
    const inviteLink = document.getElementById('inviteLink');
    const inviteInfo = document.getElementById('inviteInfo');
    
    inviteLink.value = inviteUrl;
    inviteInfo.classList.remove('hidden');
    
    // Reset copy message
    const copyMessage = document.getElementById('copyMessage');
    copyMessage.classList.add('hidden');
}

// Copy link to clipboard and show confirmation
function copyLink() {
    const inviteLink = document.getElementById('inviteLink');
    const linkText = inviteLink.value;
    
    copyToClipboard(linkText).then(success => {
        if (success) {
            showCopyConfirmation();
        } else {
            alert('Failed to copy. Please try again.');
        }
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    const createLinkButton = document.getElementById('createLinkButton');
    const copyButton = document.getElementById('copyButton');
    
    createLinkButton.addEventListener('click', generateInvitation);
    copyButton.addEventListener('click', copyLink);
});
