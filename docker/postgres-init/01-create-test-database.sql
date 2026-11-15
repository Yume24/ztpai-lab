-- Uruchamiane przez obraz postgres tylko przy pierwszej inicjalizacji pustego volume.
-- Osobna baza dla testów integracyjnych (tests/setupEnv.js), żeby nie czyściły bazy deweloperskiej.
CREATE DATABASE roombooking_test;
