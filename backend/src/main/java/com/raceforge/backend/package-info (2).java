/**
 * Training services own training business rules. Starting or recording a training session must re-check Training Lock
 * inside the same transaction before changing training data.
 */
package com.raceforge.backend.training.service;
