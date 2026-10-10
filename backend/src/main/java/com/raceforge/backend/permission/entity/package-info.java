/**
 * JPA entities for Role-Based Access Control: Role, Permission, the Role-Permission grant, and
 * an append-only audit trail of every grant/revoke action.
 *
 * Single-club system: no club_id on any of these tables.
 *
 * Business rule: MANAGE_PERMISSION is exclusive to the CLUB_MANAGER role. It can never be
 * granted to any other role, and it can never be revoked from CLUB_MANAGER — doing either would
 * leave the system with nobody able to configure permissions at all.
 */
package com.raceforge.backend.permission.entity;
