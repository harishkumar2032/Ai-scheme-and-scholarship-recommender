CREATE TABLE users (
    user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    user_type ENUM('student', 'company', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_profile (
    student_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    age INT,
    gender VARCHAR(20),
    state VARCHAR(100),
    district VARCHAR(100),
    education_level VARCHAR(100),
    course VARCHAR(100),
    college VARCHAR(200),
    year_semester VARCHAR(50),
    marks_or_cgpa DECIMAL(5,2),
    family_income DECIMAL(12,2),
    category VARCHAR(50),
    disability_status VARCHAR(50),
    rural_urban VARCHAR(20),
    parent_occupation VARCHAR(100),
    first_generation BOOLEAN,
    hosteller BOOLEAN,
    college_type VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE company_profile (
    company_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    cin VARCHAR(21) UNIQUE,
    company_name VARCHAR(200),
    company_type VARCHAR(100),
    industry VARCHAR(100),
    business_activity VARCHAR(200),
    state VARCHAR(100),
    district VARCHAR(100),
    incorporation_date DATE,
    company_status VARCHAR(50),
    employee_count INT,
    msme_status BOOLEAN,
    startup_status BOOLEAN,
    annual_turnover DECIMAL(14,2),
    export_status BOOLEAN,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE government_schemes (
    scheme_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    scheme_name VARCHAR(200) NOT NULL,
    scheme_type VARCHAR(100),
    target_user VARCHAR(50),
    government_level VARCHAR(50),
    state VARCHAR(100),
    department VARCHAR(200),
    description TEXT,
    benefits TEXT,
    eligibility TEXT,
    required_documents TEXT,
    application_start_date DATE,
    application_end_date DATE,
    official_portal VARCHAR(255),
    source_url VARCHAR(255),
    application_process TEXT,
    scheme_status VARCHAR(50),
    last_verified_date DATE,
    verification_status VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE eligibility_rules (
    rule_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    scheme_id BIGINT NOT NULL,
    min_age INT,
    max_age INT,
    income_limit DECIMAL(12,2),
    minimum_marks DECIMAL(5,2),
    education_level VARCHAR(100),
    course VARCHAR(100),
    eligible_state VARCHAR(100),
    eligible_category VARCHAR(100),
    gender VARCHAR(30),
    disability_required BOOLEAN,
    rural_urban VARCHAR(20),
    msme_required BOOLEAN,
    startup_required BOOLEAN,
    turnover_limit DECIMAL(14,2),
    employee_limit INT,
    company_type VARCHAR(100),
    industry VARCHAR(100),
    FOREIGN KEY (scheme_id) REFERENCES government_schemes(scheme_id)
);

CREATE TABLE recommendations (
    recommendation_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    scheme_id BIGINT NOT NULL,
    match_score FLOAT,
    eligibility_status VARCHAR(40),
    recommended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (scheme_id) REFERENCES government_schemes(scheme_id)
);

CREATE INDEX idx_student_user ON student_profile(user_id);
CREATE INDEX idx_company_user ON company_profile(user_id);
CREATE INDEX idx_scheme_type ON government_schemes(scheme_type);
CREATE INDEX idx_scheme_state ON government_schemes(state);
CREATE INDEX idx_recommendation_user ON recommendations(user_id);
