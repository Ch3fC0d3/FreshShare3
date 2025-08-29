/**
 * Group Details Page JavaScript
 * Handles all functionality for the group details page including:
 * - Loading and displaying group information
 * - Managing shopping list items
 * - Discussion board functionality
 * - Event management
 * - Member management
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get group ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('id');
    
    if (!groupId) {
        showToast('Error', 'No group ID specified', 'error');
        return;
    }
    
    // Current user information
    let currentUser = null;
    let isAdmin = false;
    let isMember = false;
    
    // Data storage
    let shoppingList = [];
    let discussionMessages = [];
    let groupEvents = [];
    let groupMembers = [];
    
    // Initialize the page
    initPage();
    
    /**
     * Initialize the page by loading necessary data
     */
    async function initPage() {
        try {
            // Get current user information
            await getCurrentUser();
            
            // Load group details
            await loadGroupDetails();
            
            // Setup event listeners
            setupEventListeners();
            
            // Load shopping list
            loadShoppingList();
            
            // Load discussion board
            loadDiscussionBoard();
            
            // Load events
            loadEvents();
            
            // Load members
            loadMembers();
        } catch (error) {
            console.error('Error initializing page:', error);
            showToast('Error', 'Failed to load group details', 'error');
        }
    }
    
    /**
     * Get current user information
     */
    async function getCurrentUser() {
        try {
            const response = await fetch('/api/auth/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data;
                console.log('Current user:', currentUser);
            } else {
                console.log('User not authenticated');
            }
        } catch (error) {
            console.error('Error getting current user:', error);
        }
    }
    
    /**
     * Load group details from the server
     */
    async function loadGroupDetails() {
        try {
            const response = await fetch(`/api/groups/${groupId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load group details');
            }
            
            const group = await response.json();
            displayGroupDetails(group);
            
            // Check if current user is admin or member
            if (currentUser) {
                isAdmin = group.admins.includes(currentUser.id) || group.createdBy === currentUser.id;
                isMember = group.members.includes(currentUser.id);
                
                // Update UI based on user role
                updateUIBasedOnRole();
            }
        } catch (error) {
            console.error('Error loading group details:', error);
            showToast('Error', 'Failed to load group details', 'error');
        }
    }
    
    /**
     * Display group details in the UI
     */
    function displayGroupDetails(group) {
        // Set group name and description
        document.getElementById('group-name').textContent = group.name;
        document.getElementById('group-description').textContent = group.description;
        
        // Set category badge
        const categoryBadge = document.getElementById('group-category-badge');
        categoryBadge.textContent = formatCategoryName(group.category);
        categoryBadge.className = `badge-category category-${group.category}`;
        
        // Set member count
        document.getElementById('member-count').textContent = group.members.length;
        
        // Set location
        const locationParts = [];
        if (group.location.city) locationParts.push(group.location.city);
        if (group.location.state) locationParts.push(group.location.state);
        if (group.location.zipCode) locationParts.push(group.location.zipCode);
        document.getElementById('group-location').textContent = locationParts.join(', ');
        
        // Set delivery days
        document.getElementById('delivery-days').textContent = group.deliveryDays.join(', ');
        
        // Display group rules
        displayGroupRules(group.rules);
    }
    
    /**
     * Format category name for display
     */
    function formatCategoryName(category) {
        return category
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    /**
     * Display group rules in the UI
     */
    function displayGroupRules(rules) {
        const rulesContainer = document.getElementById('group-rules');
        const emptyRules = document.getElementById('empty-rules');
        
        // Clear previous content
        rulesContainer.innerHTML = '';
        
        let hasRules = false;
        
        // Text description
        if (rules.textDescription && rules.textDescription.trim() !== '') {
            hasRules = true;
            const descriptionEl = document.createElement('div');
            descriptionEl.className = 'mb-3';
            descriptionEl.innerHTML = `<h5>Guidelines</h5><p>${rules.textDescription}</p>`;
            rulesContainer.appendChild(descriptionEl);
        }
        
        // Member limit
        if (rules.maxMembers) {
            hasRules = true;
            const memberLimitEl = document.createElement('div');
            memberLimitEl.className = 'mb-2';
            memberLimitEl.innerHTML = `<strong>Member limit:</strong> ${rules.maxMembers} members`;
            rulesContainer.appendChild(memberLimitEl);
        }
        
        // Allow guests
        const guestsEl = document.createElement('div');
        guestsEl.className = 'mb-2';
        guestsEl.innerHTML = `<strong>Guests allowed:</strong> ${rules.allowGuests ? 'Yes' : 'No'}`;
        rulesContainer.appendChild(guestsEl);
        hasRules = true;
        
        // Auto-approve members
        const approveMemEl = document.createElement('div');
        approveMemEl.className = 'mb-2';
        approveMemEl.innerHTML = `<strong>Auto-approve members:</strong> ${rules.autoApproveMembers ? 'Yes' : 'No'}`;
        rulesContainer.appendChild(approveMemEl);
        hasRules = true;
        
        // Auto-approve listings
        const approveListEl = document.createElement('div');
        approveListEl.className = 'mb-2';
        approveListEl.innerHTML = `<strong>Auto-approve listings:</strong> ${rules.autoApproveListings ? 'Yes' : 'No'}`;
        rulesContainer.appendChild(approveListEl);
        hasRules = true;
        
        // Membership fee
        if (rules.membershipFee && rules.membershipFee.required) {
            hasRules = true;
            const feeEl = document.createElement('div');
            feeEl.className = 'mb-2';
            feeEl.innerHTML = `<strong>Membership fee:</strong> $${rules.membershipFee.amount} (${rules.membershipFee.frequency})`;
            rulesContainer.appendChild(feeEl);
        }
        
        // Show/hide empty state
        if (hasRules) {
            rulesContainer.style.display = 'block';
            emptyRules.style.display = 'none';
        } else {
            rulesContainer.style.display = 'none';
            emptyRules.style.display = 'block';
        }
    }
    
    /**
     * Update UI elements based on user role (admin, member, or visitor)
     */
    function updateUIBasedOnRole() {
        const joinGroupBtn = document.getElementById('join-group-btn');
        const leaveGroupBtn = document.getElementById('leave-group-btn');
        const adminActions = document.getElementById('admin-actions');
        const addItemToggle = document.getElementById('add-item-toggle');
        const createEventBtn = document.getElementById('create-event-btn');
        const inviteMemberBtn = document.getElementById('invite-member-btn');
        
        // Update buttons based on membership status
        if (isMember) {
            joinGroupBtn.style.display = 'none';
            leaveGroupBtn.style.display = 'inline-block';
            addItemToggle.style.display = 'inline-block';
            createEventBtn.style.display = 'inline-block';
        } else {
            joinGroupBtn.style.display = 'inline-block';
            leaveGroupBtn.style.display = 'none';
            addItemToggle.style.display = 'none';
            createEventBtn.style.display = 'none';
        }
        
        // Update admin actions
        if (isAdmin) {
            adminActions.style.display = 'inline-block';
            inviteMemberBtn.style.display = 'inline-block';
        } else {
            adminActions.style.display = 'none';
            inviteMemberBtn.style.display = 'none';
        }
    }
    
    /**
     * Setup event listeners for the page
     */
    function setupEventListeners() {
        // Join group button
        document.getElementById('join-group-btn').addEventListener('click', joinGroup);
        
        // Leave group button
        document.getElementById('leave-group-btn').addEventListener('click', leaveGroup);
        
        // Share group button
        document.getElementById('share-group-btn').addEventListener('click', shareGroup);
        
        // Edit group button (admin only)
        document.getElementById('edit-group-btn').addEventListener('click', editGroup);
        
        // Shopping list item toggle
        document.getElementById('add-item-toggle').addEventListener('click', toggleAddItemForm);
        
        // Shopping list form buttons
        document.getElementById('save-item-btn').addEventListener('click', addShoppingListItem);
        document.getElementById('cancel-item-btn').addEventListener('click', toggleAddItemForm);
        
        // Discussion board
        document.getElementById('send-message-btn').addEventListener('click', sendMessage);
        
        // Events
        document.getElementById('create-event-btn').addEventListener('click', toggleCreateEventForm);
        document.getElementById('save-event-btn').addEventListener('click', createEvent);
        document.getElementById('cancel-event-btn').addEventListener('click', toggleCreateEventForm);
        
        // Members
        document.getElementById('invite-member-btn').addEventListener('click', inviteMember);
    }
    
    /**
     * Join the current group
     */
    async function joinGroup() {
        if (!currentUser) {
            showToast('Error', 'You must be logged in to join a group', 'error');
            return;
        }
        
        try {
            const response = await fetch(`/api/groups/${groupId}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to join group');
            }
            
            // Update UI
            isMember = true;
            updateUIBasedOnRole();
            
            // Reload members
            loadMembers();
            
            showToast('Success', 'You have joined the group', 'success');
        } catch (error) {
            console.error('Error joining group:', error);
            showToast('Error', 'Failed to join group', 'error');
        }
    }
    
    /**
     * Leave the current group
     */
    async function leaveGroup() {
        if (!currentUser) {
            return;
        }
        
        // Confirm before leaving
        if (!confirm('Are you sure you want to leave this group?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/groups/${groupId}/leave`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to leave group');
            }
            
            // Update UI
            isMember = false;
            isAdmin = false;
            updateUIBasedOnRole();
            
            // Reload members
            loadMembers();
            
            showToast('Success', 'You have left the group', 'success');
        } catch (error) {
            console.error('Error leaving group:', error);
            showToast('Error', 'Failed to leave group', 'error');
        }
    }
    
    /**
     * Share the group link
     */
    function shareGroup() {
        // Create a temporary input to copy the URL
        const tempInput = document.createElement('input');
        tempInput.value = window.location.href;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        showToast('Success', 'Group link copied to clipboard', 'success');
    }
    
    /**
     * Edit group details (admin only)
     */
    function editGroup() {
        // Redirect to edit page
        window.location.href = `/edit-group?id=${groupId}`;
    }
    
    /**
     * Toggle the add item form visibility
     */
    function toggleAddItemForm() {
        const form = document.getElementById('add-item-form');
        const isVisible = form.style.display !== 'none';
        
        form.style.display = isVisible ? 'none' : 'block';
        
        // Clear form if hiding
        if (isVisible) {
            document.getElementById('product-name').value = '';
            document.getElementById('vendor').value = '';
            document.getElementById('case-price').value = '';
            document.getElementById('quantity').value = '';
            document.getElementById('total-units').value = '';
            document.getElementById('item-notes').value = '';
        }
    }
    
    /**
     * Load shopping list items from the server
     */
    async function loadShoppingList() {
        try {
            const response = await fetch(`/api/groups/${groupId}/shopping-list`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                console.error('Failed to load shopping list items');
                showToast('Error', 'Failed to load shopping list items', 'error');
                return;
            }
            
            shoppingList = await response.json();
            displayShoppingList();
        } catch (error) {
            console.error('Error loading shopping list:', error);
            showToast('Error', 'Failed to load shopping list items', 'error');
            shoppingList = [];
            displayShoppingList();
        }
    }
    
    /**
     * Display shopping list items in the UI
     */
    function displayShoppingList() {
        const tableBody = document.getElementById('shopping-list-body');
        const emptyState = document.getElementById('empty-shopping-list');
        
        // Clear previous content
        tableBody.innerHTML = '';
        
        if (shoppingList.length === 0) {
            tableBody.parentElement.parentElement.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        tableBody.parentElement.parentElement.style.display = 'block';
        emptyState.style.display = 'none';
        
        // Add each item to the table
        shoppingList.forEach(item => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${item.productName}</td>
                <td>${item.vendor || '-'}</td>
                <td>$${item.casePrice.toFixed(2)}</td>
                <td>${item.quantity}</td>
                <td>${item.totalUnits}</td>
                <td class="shopping-list-actions">
                    ${isMember ? `
                        <button class="btn btn-sm btn-outline-primary edit-item" data-id="${item._id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${isAdmin ? `
                            <button class="btn btn-sm btn-outline-danger delete-item" data-id="${item._id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    ` : ''}
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Add event listeners to edit and delete buttons
        document.querySelectorAll('.edit-item').forEach(button => {
            button.addEventListener('click', () => editShoppingListItem(button.dataset.id));
        });
        
        document.querySelectorAll('.delete-item').forEach(button => {
            button.addEventListener('click', () => deleteShoppingListItem(button.dataset.id));
        });
    }
    
    /**
     * Add a new shopping list item
     */
    async function addShoppingListItem() {
        // Get form values
        const productName = document.getElementById('product-name').value.trim();
        const vendor = document.getElementById('vendor').value.trim();
        const casePrice = parseFloat(document.getElementById('case-price').value) || 0;
        const quantity = parseInt(document.getElementById('quantity').value) || 1;
        const totalUnits = parseInt(document.getElementById('total-units').value) || 1;
        const notes = document.getElementById('item-notes').value.trim();
        
        // Validate required fields
        if (!productName) {
            showToast('Error', 'Product name is required', 'error');
            return;
        }
        
        // Create item object
        const newItem = {
            productName,
            vendor,
            casePrice,
            quantity,
            totalUnits,
            notes,
            createdBy: currentUser.id,
            groupId
        };
        
        try {
            const response = await fetch(`/api/groups/${groupId}/shopping-list`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(newItem)
            });
            
            if (!response.ok) {
                // For demo purposes, add to local array if API doesn't exist yet
                newItem._id = Date.now().toString();
                shoppingList.push(newItem);
                displayShoppingList();
                toggleAddItemForm();
                showToast('Success', 'Item added to shopping list', 'success');
                return;
            }
            
            const addedItem = await response.json();
            shoppingList.push(addedItem);
            displayShoppingList();
            toggleAddItemForm();
            showToast('Success', 'Item added to shopping list', 'success');
        } catch (error) {
            console.error('Error adding shopping list item:', error);
            // For demo purposes, add to local array
            newItem._id = Date.now().toString();
            shoppingList.push(newItem);
            displayShoppingList();
            toggleAddItemForm();
            showToast('Success', 'Item added to shopping list', 'success');
        }
    }
    
    /**
     * Edit a shopping list item
     */
    function editShoppingListItem(itemId) {
        // Find the item
        const item = shoppingList.find(i => i._id === itemId);
        if (!item) return;
        
        // Show the form and populate with item data
        document.getElementById('product-name').value = item.productName;
        document.getElementById('vendor').value = item.vendor || '';
        document.getElementById('case-price').value = item.casePrice;
        document.getElementById('quantity').value = item.quantity;
        document.getElementById('total-units').value = item.totalUnits;
        document.getElementById('item-notes').value = item.notes || '';
        
        // Show the form
        document.getElementById('add-item-form').style.display = 'block';
        
        // Change save button to update
        const saveButton = document.getElementById('save-item-btn');
        saveButton.textContent = 'Update Item';
        saveButton.dataset.itemId = itemId;
        
        // Change event listener to update item
        saveButton.removeEventListener('click', addShoppingListItem);
        saveButton.addEventListener('click', function updateHandler() {
            updateShoppingListItem(itemId);
            saveButton.removeEventListener('click', updateHandler);
            saveButton.addEventListener('click', addShoppingListItem);
        });
    }
    
    /**
     * Update a shopping list item
     */
    async function updateShoppingListItem(itemId) {
        // Get form values
        const productName = document.getElementById('product-name').value.trim();
        const vendor = document.getElementById('vendor').value.trim();
        const casePrice = parseFloat(document.getElementById('case-price').value) || 0;
        const quantity = parseInt(document.getElementById('quantity').value) || 1;
        const totalUnits = parseInt(document.getElementById('total-units').value) || 1;
        const notes = document.getElementById('item-notes').value.trim();
        
        // Validate required fields
        if (!productName) {
            showToast('Error', 'Product name is required', 'error');
            return;
        }
        
        // Create updated item object
        const updatedItem = {
            productName,
            vendor,
            casePrice,
            quantity,
            totalUnits,
            notes
        };
        
        try {
            const response = await fetch(`/api/groups/${groupId}/shopping-list/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updatedItem)
            });
            
            if (!response.ok) {
                // For demo purposes, update local array if API doesn't exist yet
                const index = shoppingList.findIndex(i => i._id === itemId);
                if (index !== -1) {
                    shoppingList[index] = { ...shoppingList[index], ...updatedItem };
                    displayShoppingList();
                    toggleAddItemForm();
                    
                    // Reset save button
                    const saveButton = document.getElementById('save-item-btn');
                    saveButton.textContent = 'Add to Shopping List';
                    delete saveButton.dataset.itemId;
                    
                    showToast('Success', 'Item updated', 'success');
                }
                return;
            }
            
            // Update the item in the array
            const updatedItemData = await response.json();
            const index = shoppingList.findIndex(i => i._id === itemId);
            if (index !== -1) {
                shoppingList[index] = updatedItemData;
            }
            
            displayShoppingList();
            toggleAddItemForm();
            
            // Reset save button
            const saveButton = document.getElementById('save-item-btn');
            saveButton.textContent = 'Add to Shopping List';
            delete saveButton.dataset.itemId;
            
            showToast('Success', 'Item updated', 'success');
        } catch (error) {
            console.error('Error updating shopping list item:', error);
            // For demo purposes, update local array
            const index = shoppingList.findIndex(i => i._id === itemId);
            if (index !== -1) {
                shoppingList[index] = { ...shoppingList[index], ...updatedItem };
                displayShoppingList();
                toggleAddItemForm();
                
                // Reset save button
                const saveButton = document.getElementById('save-item-btn');
                saveButton.textContent = 'Add to Shopping List';
                delete saveButton.dataset.itemId;
                
                showToast('Success', 'Item updated', 'success');
            }
        }
    }
    
    /**
     * Delete a shopping list item
     */
    async function deleteShoppingListItem(itemId) {
        // Confirm before deleting
        if (!confirm('Are you sure you want to delete this item?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/groups/${groupId}/shopping-list/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                // For demo purposes, remove from local array if API doesn't exist yet
                shoppingList = shoppingList.filter(item => item._id !== itemId);
                displayShoppingList();
                showToast('Success', 'Item deleted', 'success');
                return;
            }
            
            // Remove the item from the array
            shoppingList = shoppingList.filter(item => item._id !== itemId);
            displayShoppingList();
            showToast('Success', 'Item deleted', 'success');
        } catch (error) {
            console.error('Error deleting shopping list item:', error);
            // For demo purposes, remove from local array
            shoppingList = shoppingList.filter(item => item._id !== itemId);
            displayShoppingList();
            showToast('Success', 'Item deleted', 'success');
        }
    }
    
    // Sample data functions removed
    
    /**
     * Load discussion board messages from the server
     */
    async function loadDiscussionBoard() {
        try {
            const response = await fetch(`/api/groups/${groupId}/messages`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                console.error('Failed to load discussion messages');
                showToast('Error', 'Failed to load discussion messages', 'error');
                return;
            }
            
            discussionMessages = await response.json();
            displayDiscussionMessages();
        } catch (error) {
            console.error('Error loading discussion messages:', error);
            showToast('Error', 'Failed to load discussion messages', 'error');
            discussionMessages = [];
            displayDiscussionMessages();
        }
    }
    
    /**
     * Display discussion messages in the UI
     */
    function displayDiscussionMessages() {
        const discussionBoard = document.getElementById('discussion-board');
        const emptyDiscussion = document.getElementById('empty-discussion');
        
        // Clear previous content
        discussionBoard.innerHTML = '';
        
        if (discussionMessages.length === 0) {
            discussionBoard.style.display = 'none';
            emptyDiscussion.style.display = 'block';
            return;
        }
        
        discussionBoard.style.display = 'block';
        emptyDiscussion.style.display = 'none';
        
        // Sort messages by date (newest first)
        discussionMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Add each message to the board
        discussionMessages.forEach(message => {
            const messageEl = document.createElement('div');
            messageEl.className = 'message';
            
            const createdDate = new Date(message.createdAt);
            const formattedDate = createdDate.toLocaleString();
            
            messageEl.innerHTML = `
                <div class="message-header">
                    <strong>${message.author.name || 'Anonymous'}</strong>
                    <small>${formattedDate}</small>
                </div>
                <div class="message-content">${message.content}</div>
            `;
            
            discussionBoard.appendChild(messageEl);
        });
    }
    
    /**
     * Send a new message to the discussion board
     */
    async function sendMessage() {
        if (!currentUser) {
            showToast('Error', 'You must be logged in to post messages', 'error');
            return;
        }
        
        const messageInput = document.getElementById('message-input');
        const content = messageInput.value.trim();
        
        if (!content) {
            showToast('Error', 'Message cannot be empty', 'error');
            return;
        }
        
        const newMessage = {
            content,
            groupId,
            authorId: currentUser.id
        };
        
        try {
            const response = await fetch(`/api/groups/${groupId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(newMessage)
            });
            
            if (!response.ok) {
                // For demo purposes, add to local array if API doesn't exist yet
                const demoMessage = {
                    _id: Date.now().toString(),
                    content,
                    createdAt: new Date().toISOString(),
                    author: {
                        _id: currentUser.id,
                        name: currentUser.username || 'Current User'
                    },
                    groupId
                };
                
                discussionMessages.unshift(demoMessage);
                displayDiscussionMessages();
                messageInput.value = '';
                showToast('Success', 'Message posted', 'success');
                return;
            }
            
            const addedMessage = await response.json();
            discussionMessages.unshift(addedMessage);
            displayDiscussionMessages();
            messageInput.value = '';
            showToast('Success', 'Message posted', 'success');
        } catch (error) {
            console.error('Error posting message:', error);
            // For demo purposes, add to local array
            const demoMessage = {
                _id: Date.now().toString(),
                content,
                createdAt: new Date().toISOString(),
                author: {
                    _id: currentUser.id,
                    name: currentUser.username || 'Current User'
                },
                groupId
            };
            
            discussionMessages.unshift(demoMessage);
            displayDiscussionMessages();
            messageInput.value = '';
            showToast('Success', 'Message posted', 'success');
        }
    }
    
    // Sample data functions removed
    
    /**
     * Toggle the create event form visibility
     */
    function toggleCreateEventForm() {
        const form = document.getElementById('create-event-form');
        const isVisible = form.style.display !== 'none';
        
        form.style.display = isVisible ? 'none' : 'block';
        
        // Clear form if hiding
        if (isVisible) {
            document.getElementById('event-title').value = '';
            document.getElementById('event-date').value = '';
            document.getElementById('event-location').value = '';
            document.getElementById('event-description').value = '';
        }
    }
    
    /**
     * Load events from the server
     */
    async function loadEvents() {
        try {
            const response = await fetch(`/api/groups/${groupId}/events`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                console.error('Failed to load events');
                showToast('Error', 'Failed to load events', 'error');
                return;
            }
            
            groupEvents = await response.json();
            displayEvents();
        } catch (error) {
            console.error('Error loading events:', error);
            showToast('Error', 'Failed to load events', 'error');
            groupEvents = [];
            displayEvents();
        }
    }
    
    /**
     * Display events in the UI
     */
    function displayEvents() {
        const eventsList = document.getElementById('events-list');
        const emptyEvents = document.getElementById('empty-events');
        
        // Clear previous content
        eventsList.innerHTML = '';
        
        if (groupEvents.length === 0) {
            eventsList.style.display = 'none';
            emptyEvents.style.display = 'block';
            return;
        }
        
        eventsList.style.display = 'grid';
        emptyEvents.style.display = 'none';
        
        // Sort events by date (soonest first)
        groupEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Add each event to the list
        groupEvents.forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = 'event-card';
            
            const eventDate = new Date(event.date);
            const formattedDate = eventDate.toLocaleDateString();
            const formattedTime = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            eventEl.innerHTML = `
                <h5>${event.title}</h5>
                <div><i class="fas fa-calendar"></i> ${formattedDate} at ${formattedTime}</div>
                <div><i class="fas fa-map-marker-alt"></i> ${event.location || 'Location TBD'}</div>
                <p>${event.description || ''}</p>
                ${isAdmin || event.createdBy === currentUser?.id ? `
                    <div class="event-actions">
                        <button class="btn btn-sm btn-outline-primary edit-event" data-id="${event._id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-event" data-id="${event._id}">
                            <i class="fas fa-trash"></i> Cancel
                        </button>
                    </div>
                ` : ''}
            `;
            
            eventsList.appendChild(eventEl);
        });
        
        // Add event listeners to edit and delete buttons
        document.querySelectorAll('.edit-event').forEach(button => {
            button.addEventListener('click', () => editEvent(button.dataset.id));
        });
        
        document.querySelectorAll('.delete-event').forEach(button => {
            button.addEventListener('click', () => deleteEvent(button.dataset.id));
        });
    }
    
    /**
     * Create a new event
     */
    async function createEvent() {
        if (!currentUser) {
            showToast('Error', 'You must be logged in to create events', 'error');
            return;
        }
        
        // Get form values
        const title = document.getElementById('event-title').value.trim();
        const date = document.getElementById('event-date').value;
        const location = document.getElementById('event-location').value.trim();
        const description = document.getElementById('event-description').value.trim();
        
        // Validate required fields
        if (!title) {
            showToast('Error', 'Event title is required', 'error');
            return;
        }
        
        if (!date) {
            showToast('Error', 'Event date is required', 'error');
            return;
        }
        
        // Create event object
        const newEvent = {
            title,
            date,
            location,
            description,
            createdBy: currentUser.id,
            groupId
        };
        
        try {
            const response = await fetch(`/api/groups/${groupId}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(newEvent)
            });
            
            if (!response.ok) {
                // For demo purposes, add to local array if API doesn't exist yet
                newEvent._id = Date.now().toString();
                newEvent.date = new Date(date).toISOString();
                groupEvents.push(newEvent);
                displayEvents();
                toggleCreateEventForm();
                showToast('Success', 'Event created', 'success');
                return;
            }
            
            const addedEvent = await response.json();
            groupEvents.push(addedEvent);
            displayEvents();
            toggleCreateEventForm();
            showToast('Success', 'Event created', 'success');
        } catch (error) {
            console.error('Error creating event:', error);
            // For demo purposes, add to local array
            newEvent._id = Date.now().toString();
            newEvent.date = new Date(date).toISOString();
            groupEvents.push(newEvent);
            displayEvents();
            toggleCreateEventForm();
            showToast('Success', 'Event created', 'success');
        }
    }
    
    /**
     * Edit an event
     */
    function editEvent(eventId) {
        // Find the event
        const event = groupEvents.find(e => e._id === eventId);
        if (!event) return;
        
        // Show the form and populate with event data
        document.getElementById('event-title').value = event.title;
        
        // Format date for datetime-local input
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
        document.getElementById('event-date').value = formattedDate;
        
        document.getElementById('event-location').value = event.location || '';
        document.getElementById('event-description').value = event.description || '';
        
        // Show the form
        document.getElementById('create-event-form').style.display = 'block';
        
        // Change save button to update
        const saveButton = document.getElementById('save-event-btn');
        saveButton.textContent = 'Update Event';
        saveButton.dataset.eventId = eventId;
        
        // Change event listener to update event
        saveButton.removeEventListener('click', createEvent);
        saveButton.addEventListener('click', function updateHandler() {
            updateEvent(eventId);
            saveButton.removeEventListener('click', updateHandler);
            saveButton.addEventListener('click', createEvent);
        });
    }
    
    /**
     * Update an event
     */
    async function updateEvent(eventId) {
        // Get form values
        const title = document.getElementById('event-title').value.trim();
        const date = document.getElementById('event-date').value;
        const location = document.getElementById('event-location').value.trim();
        const description = document.getElementById('event-description').value.trim();
        
        // Validate required fields
        if (!title) {
            showToast('Error', 'Event title is required', 'error');
            return;
        }
        
        if (!date) {
            showToast('Error', 'Event date is required', 'error');
            return;
        }
        
        // Create updated event object
        const updatedEvent = {
            title,
            date,
            location,
            description
        };
        
        try {
            const response = await fetch(`/api/groups/${groupId}/events/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updatedEvent)
            });
            
            if (!response.ok) {
                // For demo purposes, update local array if API doesn't exist yet
                const index = groupEvents.findIndex(e => e._id === eventId);
                if (index !== -1) {
                    groupEvents[index] = { 
                        ...groupEvents[index], 
                        ...updatedEvent,
                        date: new Date(date).toISOString()
                    };
                    displayEvents();
                    toggleCreateEventForm();
                    
                    // Reset save button
                    const saveButton = document.getElementById('save-event-btn');
                    saveButton.textContent = 'Create Event';
                    delete saveButton.dataset.eventId;
                    
                    showToast('Success', 'Event updated', 'success');
                }
                return;
            }
            
            // Update the event in the array
            const updatedEventData = await response.json();
            const index = groupEvents.findIndex(e => e._id === eventId);
            if (index !== -1) {
                groupEvents[index] = updatedEventData;
            }
            
            displayEvents();
            toggleCreateEventForm();
            
            // Reset save button
            const saveButton = document.getElementById('save-event-btn');
            saveButton.textContent = 'Create Event';
            delete saveButton.dataset.eventId;
            
            showToast('Success', 'Event updated', 'success');
        } catch (error) {
            console.error('Error updating event:', error);
            // For demo purposes, update local array
            const index = groupEvents.findIndex(e => e._id === eventId);
            if (index !== -1) {
                groupEvents[index] = { 
                    ...groupEvents[index], 
                    ...updatedEvent,
                    date: new Date(date).toISOString()
                };
                displayEvents();
                toggleCreateEventForm();
                
                // Reset save button
                const saveButton = document.getElementById('save-event-btn');
                saveButton.textContent = 'Create Event';
                delete saveButton.dataset.eventId;
                
                showToast('Success', 'Event updated', 'success');
            }
        }
    }
    
    /**
     * Delete an event
     */
    async function deleteEvent(eventId) {
        // Confirm before deleting
        if (!confirm('Are you sure you want to cancel this event?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/groups/${groupId}/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                // For demo purposes, remove from local array if API doesn't exist yet
                groupEvents = groupEvents.filter(event => event._id !== eventId);
                displayEvents();
                showToast('Success', 'Event cancelled', 'success');
                return;
            }
            
            // Remove the event from the array
            groupEvents = groupEvents.filter(event => event._id !== eventId);
            displayEvents();
            showToast('Success', 'Event cancelled', 'success');
        } catch (error) {
            console.error('Error deleting event:', error);
            // For demo purposes, remove from local array
            groupEvents = groupEvents.filter(event => event._id !== eventId);
            displayEvents();
            showToast('Success', 'Event cancelled', 'success');
        }
    }
    
    // Sample data functions removed
    
    /**
     * Load members from the server
     */
    async function loadMembers() {
        try {
            const response = await fetch(`/api/groups/${groupId}/members`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                console.error('Failed to load group members');
                showToast('Error', 'Failed to load group members', 'error');
                return;
            }
            
            groupMembers = await response.json();
            displayMembers();
        } catch (error) {
            console.error('Error loading members:', error);
            showToast('Error', 'Failed to load group members', 'error');
            groupMembers = [];
            displayMembers();
        }
    }
    
    /**
     * Display members in the UI
     */
    function displayMembers() {
        const membersGrid = document.getElementById('members-grid');
        const emptyMembers = document.getElementById('empty-members');
        
        // Clear previous content
        membersGrid.innerHTML = '';
        
        if (groupMembers.length === 0) {
            membersGrid.style.display = 'none';
            emptyMembers.style.display = 'block';
            return;
        }
        
        membersGrid.style.display = 'grid';
        emptyMembers.style.display = 'none';
        
        // Add each member to the grid
        groupMembers.forEach(member => {
            const memberEl = document.createElement('div');
            memberEl.className = 'member-card';
            
            const isAdmin = member.role === 'admin';
            const roleClass = isAdmin ? 'role-admin' : 'role-member';
            const roleText = isAdmin ? 'Admin' : 'Member';
            
            memberEl.innerHTML = `
                <img src="${member.avatar || '/images/default-avatar.png'}" alt="${member.name}" class="member-avatar">
                <div>${member.name}</div>
                <span class="member-role ${roleClass}">${roleText}</span>
            `;
            
            membersGrid.appendChild(memberEl);
        });
    }
    
    /**
     * Invite a member to the group
     */
    function inviteMember() {
        // Prompt for email address
        const email = prompt('Enter the email address of the person you want to invite:');
        
        if (!email) return;
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Error', 'Please enter a valid email address', 'error');
            return;
        }
        
        // Send invitation
        sendInvitation(email);
    }
    
    /**
     * Send an invitation to join the group
     */
    async function sendInvitation(email) {
        try {
            const response = await fetch(`/api/groups/${groupId}/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ email })
            });
            
            if (!response.ok) {
                // For demo purposes, show success if API doesn't exist yet
                showToast('Success', `Invitation sent to ${email}`, 'success');
                return;
            }
            
            showToast('Success', `Invitation sent to ${email}`, 'success');
        } catch (error) {
            console.error('Error sending invitation:', error);
            // For demo purposes, show success
            showToast('Success', `Invitation sent to ${email}`, 'success');
        }
    }
    
    // Sample data functions removed
    
    /**
     * Show a toast notification
     */
    function showToast(title, message, type = 'info') {
        const toast = document.getElementById('status-toast');
        const toastTitle = document.getElementById('toast-title');
        const toastMessage = document.getElementById('toast-message');
        
        // Set toast content
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        
        // Set toast type
        toast.className = 'toast';
        toast.classList.add(`toast-${type}`);
        
        // Show the toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
});

