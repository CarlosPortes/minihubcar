CREATE TABLE product_identifier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    variation_id UUID NOT NULL
        REFERENCES variation(id),

    identifier_type_id UUID NOT NULL
        REFERENCES identifier_type(id),

    code VARCHAR(150) NOT NULL,
    normalized_code VARCHAR(150) NOT NULL,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_product_identifier
    ON product_identifier(
        identifier_type_id,
        normalized_code
    );