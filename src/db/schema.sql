-- =============================================
-- LINE POS System - Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------
-- Users Table
-- Stores LINE OA users
-- ---------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    line_user_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------
-- Menus Table
-- Stores menu items for each user
-- ---------------------------------------------
CREATE TABLE menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookup
CREATE INDEX idx_menus_user_id ON menus(user_id);
CREATE INDEX idx_menus_is_active ON menus(is_active);

-- ---------------------------------------------
-- Order Sessions Table
-- Tracks active shopping sessions
-- ---------------------------------------------
CREATE TYPE session_status AS ENUM ('open', 'closed');

CREATE TABLE order_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status session_status DEFAULT 'open',
    total INTEGER DEFAULT 0 CHECK (total >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for active session lookup
CREATE INDEX idx_sessions_user_id_status ON order_sessions(user_id, status);

-- ---------------------------------------------
-- Order Items Table
-- Items within a session
-- ---------------------------------------------
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES order_sessions(id) ON DELETE CASCADE,
    menu_id UUID REFERENCES menus(id) ON DELETE CASCADE,
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, menu_id)
);

CREATE INDEX idx_items_session_id ON order_items(session_id);

-- ---------------------------------------------
-- Orders Table (Completed Orders)
-- Finalized orders after checkout
-- ---------------------------------------------
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total INTEGER NOT NULL CHECK (total >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- ---------------------------------------------
-- Function to update updated_at timestamp
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_order_sessions_updated_at
    BEFORE UPDATE ON order_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------
-- Default Menu Items Function
-- Seeds default menu when user is created
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION seed_default_menu()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO menus (user_id, name, price) VALUES
        (NEW.id, 'ชานม', 25),
        (NEW.id, 'ชาเขียว', 30);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seed_user_default_menu
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION seed_default_menu();
