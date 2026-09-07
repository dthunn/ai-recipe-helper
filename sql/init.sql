CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE recipes (
    id BIGSERIAL PRIMARY KEY,
    recipe_id BIGINT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    author_name TEXT,
    description TEXT,
    category TEXT,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    ingredient_quantities TEXT[] NOT NULL DEFAULT '{}',
    ingredient_parts TEXT[] NOT NULL DEFAULT '{}',
    instructions TEXT[] NOT NULL DEFAULT '{}',
    images TEXT[] NOT NULL DEFAULT '{}',
    cook_time_minutes INT,
    prep_time_minutes INT,
    total_time_minutes INT,
    date_published TIMESTAMPTZ,
    rating NUMERIC,
    review_count INT,
    calories NUMERIC,
    fat_g NUMERIC,
    saturated_fat_g NUMERIC,
    cholesterol_mg NUMERIC,
    sodium_mg NUMERIC,
    carbohydrate_g NUMERIC,
    fiber_g NUMERIC,
    sugar_g NUMERIC,
    protein_g NUMERIC,
    servings TEXT,
    recipe_yield TEXT,
    search_text TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX recipes_category_idx
ON recipes(category);

CREATE INDEX recipes_ingredient_parts_idx
ON recipes
USING GIN(ingredient_parts);

CREATE INDEX recipes_keywords_idx
ON recipes
USING GIN(keywords);

CREATE INDEX recipes_embedding_idx
ON recipes
USING hnsw (embedding vector_cosine_ops);
