PRAGMA foreign_keys = ON;

CREATE TABLE funders (
  externalId TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE clients (
  externalId TEXT PRIMARY KEY,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  dateOfBirth TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Active', 'Inactive'))
);

CREATE TABLE practitioners (
  externalId TEXT PRIMARY KEY,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  activeFrom TEXT NOT NULL,
  activeTo TEXT
);

CREATE TABLE authorisations (
  externalId TEXT PRIMARY KEY,
  clientId TEXT NOT NULL REFERENCES clients (externalId),
  funderId TEXT NOT NULL REFERENCES funders (externalId),
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  hoursApproved REAL NOT NULL,
  hoursRemaining REAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Active', 'Expired'))
);

CREATE TABLE cases (
  externalId TEXT PRIMARY KEY,
  clientId TEXT NOT NULL REFERENCES clients (externalId),
  funderId TEXT NOT NULL REFERENCES funders (externalId),
  openedDate TEXT NOT NULL,
  closedDate TEXT,
  status TEXT NOT NULL CHECK (status IN ('Open', 'Closed'))
);

CREATE TABLE bookings (
  externalId TEXT PRIMARY KEY,
  clientId TEXT NOT NULL REFERENCES clients (externalId),
  practitionerId TEXT NOT NULL REFERENCES practitioners (externalId),
  authorisationId TEXT REFERENCES authorisations (externalId),
  date TEXT NOT NULL,
  durationHours REAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Scheduled', 'Completed'))
);
