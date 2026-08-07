-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS nexus_store;
USE nexus_store;

-- Create the products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image VARCHAR(255)
);

-- Insert dummy e-commerce products
INSERT INTO products (name, description, price, image) VALUES 
('UltraBook Pro 15"', 'High performance laptop with stunning retina display.', 1299.99, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'),
('NoiseCancelling Headphones', 'Industry leading noise cancellation.', 299.99, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'),
('Smartwatch Series 8', 'Track your fitness and stay connected.', 399.99, 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'),
('4K Monitor 27"', 'Crystal clear display for professionals.', 450.00, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'),
('Mechanical Keyboard', 'Tactile feedback for the best typing experience.', 120.00, 'https://images.unsplash.com/photo-1595225476474-87563907a212?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'),
('Wireless Mouse', 'Ergonomic and precise tracking.', 45.99, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60');
