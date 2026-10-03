CREATE TABLE casting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    miniature_brand_id UUID NOT NULL
        REFERENCES miniature_brand(id),
    name VARCHAR(200) NOT NULL,
    normalized_name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX ux_casting_brand_name
    ON casting(miniature_brand_id, normalized_name);


CREATE TABLE casting_vehicle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    casting_id UUID NOT NULL
        REFERENCES casting(id),
    vehicle_model_id UUID NOT NULL
        REFERENCES vehicle_model(id),

    relation_type VARCHAR(30) NOT NULL
        CHECK (
            relation_type IN (
                'REPRESENTS',
                'BASED_ON',
                'INSPIRED_BY'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_casting_vehicle
        UNIQUE (
            casting_id,
            vehicle_model_id,
            relation_type
        )
);


CREATE TABLE entertainment_franchise (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    normalized_name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);


CREATE TABLE casting_franchise (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    casting_id UUID NOT NULL
        REFERENCES casting(id),
    franchise_id UUID NOT NULL
        REFERENCES entertainment_franchise(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_casting_franchise
        UNIQUE (casting_id, franchise_id)
);