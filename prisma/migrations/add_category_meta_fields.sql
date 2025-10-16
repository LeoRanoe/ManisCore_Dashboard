-- Add missing meta fields to categories table
-- This script should be run on the production database

-- Add metaTitle column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='categories' AND column_name='metaTitle') THEN
        ALTER TABLE categories ADD COLUMN "metaTitle" TEXT;
    END IF;
END $$;

-- Add metaDescription column if it doesn't exist  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='categories' AND column_name='metaDescription') THEN
        ALTER TABLE categories ADD COLUMN "metaDescription" TEXT;
    END IF;
END $$;
