CREATE TABLE variation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    casting_id UUID NOT NULL
        REFERENCES casting(id),

    series_id UUID,
    scale_id UUID,

    name VARCHAR(250) NOT NULL,

    release_year INTEGER
        CHECK (
            release_year IS NULL
            OR release_year BETWEEN 1800 AND 2200
        ),

    primary_color VARCHAR(100),
    edition VARCHAR(150),
    packaging VARCHAR(150),
    description TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);