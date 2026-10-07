-- BloodLink: widen MySQL ENUM columns to match current Java enums.
-- Safe for existing data: original ENUM members keep their order; new members are appended.
-- Do not reorder existing values — MySQL stores ENUM as integer indexes.
-- This script is the source of truth for this fix. Do not rely on ddl-auto=update.

-- blood_matches.status
-- Java MatchStatus: PENDING, ACCEPTED, DECLINED, CONTACTED, SCHEDULED, COMPLETED, EXPIRED, CANCELLED
-- Old DB: enum('ACCEPTED','CANCELLED','DECLINED','EXPIRED','PENDING')
ALTER TABLE blood_matches
    MODIFY COLUMN status ENUM(
        'ACCEPTED',
        'CANCELLED',
        'DECLINED',
        'EXPIRED',
        'PENDING',
        'CONTACTED',
        'SCHEDULED',
        'COMPLETED'
    ) NOT NULL;

-- donations.status
-- Java DonationStatus: COMPLETED, SCHEDULED, CANCELLED, NO_SHOW, RECORDED
-- Old DB: enum('COMPLETED','RECORDED')
ALTER TABLE donations
    MODIFY COLUMN status ENUM(
        'COMPLETED',
        'RECORDED',
        'SCHEDULED',
        'CANCELLED',
        'NO_SHOW'
    ) NOT NULL;

-- hospitals.verification_status
-- Java HospitalVerificationStatus: PENDING, VERIFIED, REJECTED, SUSPENDED
-- Old DB: enum('PENDING','REJECTED','VERIFIED')
ALTER TABLE hospitals
    MODIFY COLUMN verification_status ENUM(
        'PENDING',
        'REJECTED',
        'VERIFIED',
        'SUSPENDED'
    ) NOT NULL;

-- users.status
-- Java UserStatus: ACTIVE, DEACTIVATED, SUSPENDED
-- Old DB: enum('ACTIVE','DEACTIVATED')
ALTER TABLE users
    MODIFY COLUMN status ENUM(
        'ACTIVE',
        'DEACTIVATED',
        'SUSPENDED'
    ) NOT NULL;
