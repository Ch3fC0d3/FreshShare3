const React = require('react');

// Group Card component for displaying group information
const GroupCard = ({ group }) => {
  return (
    <div className="group-card">
      <div className="group-card-image">
        <img src={group.imageUrl || "/images/default-group.jpg"} alt={group.name} />
      </div>
      <div className="group-card-content">
        <h3 className="group-card-title">{group.name}</h3>
        <p className="group-card-description">{group.description}</p>
        <div className="group-card-meta">
          <span className="group-card-members">
            <i className="fas fa-users"></i> {group.memberCount} members
          </span>
          <span className="group-card-location">
            <i className="fas fa-map-marker-alt"></i> {group.location}
          </span>
        </div>
        <a href={`/groups/${group.id}`} className="btn btn-primary">View Group</a>
      </div>
    </div>
  );
};

// Group Cards Grid component for displaying multiple group cards
const GroupCardsGrid = ({ groups }) => {
  return (
    <div className="group-cards-grid">
      {groups.map(group => (
        <GroupCard key={group.id} group={group} />
      ))}
    </div>
  );
};

module.exports = {
  GroupCard,
  GroupCardsGrid
};
