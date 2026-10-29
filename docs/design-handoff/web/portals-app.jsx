/* global React, ReactDOM, DesignCanvas, DCSection, DCArtboard, PSidebar, AD_NAV, TR_NAV, AdminOverview, AdminClubs, AdminTrainers, TrainerHome, TrainerAthletes, TrainerAthlete, TrainerAchievements, TrainerInvitations */

const Frame = ({ label, nav, children }) => (
  <div className="ap-frame" data-screen-label={label}>
    <PSidebar {...nav} />
    {children}
  </div>
);

const PortalsApp = () => (
  <DesignCanvas>
    <DCSection id="admin-portal" title="Admin portal" subtitle="Platform staff · manage clubs and trainers · 1440 × 900">
      <DCArtboard id="a-overview" label="A1 · Overview" width={1440} height={900}><Frame label="A1 Admin overview" nav={AD_NAV("overview")}><AdminOverview /></Frame></DCArtboard>
      <DCArtboard id="a-clubs" label="A2 · Clubs + application review" width={1440} height={900}><Frame label="A2 Admin clubs" nav={AD_NAV("clubs")}><AdminClubs /></Frame></DCArtboard>
      <DCArtboard id="a-trainers" label="A3 · Trainers" width={1440} height={900}><Frame label="A3 Admin trainers" nav={AD_NAV("trainers")}><AdminTrainers /></Frame></DCArtboard>
      <DCArtboard id="a-invite" label="A4 · Invite trainer (modal)" width={1440} height={900}><Frame label="A4 Admin invite trainer" nav={AD_NAV("trainers")}><AdminTrainers modal /></Frame></DCArtboard>
    </DCSection>
    <DCSection id="trainer-portal" title="Trainer portal" subtitle="Coaches · clubs, athlete achievements, metrics, invitations · 1440 × 900">
      <DCArtboard id="t-home" label="T1 · Home" width={1440} height={900}><Frame label="T1 Trainer home" nav={TR_NAV("home")}><TrainerHome /></Frame></DCArtboard>
      <DCArtboard id="t-athletes" label="T2 · Athletes roster" width={1440} height={900}><Frame label="T2 Trainer athletes" nav={TR_NAV("athletes")}><TrainerAthletes /></Frame></DCArtboard>
      <DCArtboard id="t-athlete" label="T3 · Athlete · metrics + achievements" width={1440} height={900}><Frame label="T3 Trainer athlete" nav={TR_NAV("athletes")}><TrainerAthlete /></Frame></DCArtboard>
      <DCArtboard id="t-log" label="T4 · Log metrics (modal)" width={1440} height={900}><Frame label="T4 Trainer log metrics" nav={TR_NAV("athletes")}><TrainerAthlete modal /></Frame></DCArtboard>
      <DCArtboard id="t-achievements" label="T5 · Achievements review" width={1440} height={900}><Frame label="T5 Trainer achievements" nav={TR_NAV("achievements")}><TrainerAchievements /></Frame></DCArtboard>
      <DCArtboard id="t-invitations" label="T6 · Invitations" width={1440} height={900}><Frame label="T6 Trainer invitations" nav={TR_NAV("invitations")}><TrainerInvitations /></Frame></DCArtboard>
    </DCSection>
  </DesignCanvas>
);

ReactDOM.createRoot(document.getElementById("root")).render(<PortalsApp />);
