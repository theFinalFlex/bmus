# Migration Architecture Diagrams

## Current System Architecture

```mermaid
graph TB
    subgraph "Current Frontend"
        D[Dashboard]
        C[Certifications]
        A[Add Cert]
        U[Users Admin]
        AP[Approvals]
        CM[Cert Management]
    end
    
    subgraph "Current Backend APIs"
        UC[User Certs API]
        AA[Admin API]
        CA[Catalog API]
        CMA[Cert Master API]
    end
    
    subgraph "Current Data Storage"
        MCT[mockCertificationTypes<br/>Legacy Catalog]
        MC[mockCertifications<br/>User Instances]
        MU[mockUsers<br/>User Data]
        MP[mockPendingSubmissions]
        MCM[mockCertificationMaster<br/>NEW Master Data]
    end
    
    D --> UC
    C --> UC
    A --> CA
    A --> UC
    U --> AA
    AP --> AA
    CM --> CMA
    
    UC --> MC
    UC --> MCT
    AA --> MC
    AA --> MU
    CA --> MCT
    CMA --> MCM
    
    MC -.-> MCT
    MC --> MU
    
    style MCT fill:#ffeb3b
    style MCM fill:#4caf50
    style MC fill:#ff5722
```

## Target System Architecture (Post-Migration)

```mermaid
graph TB
    subgraph "Frontend (Updated)"
        D2[Dashboard]
        C2[Certifications]
        A2[Add Cert]
        U2[Users Admin]
        AP2[Approvals]
        CM2[Cert Management]
    end
    
    subgraph "Backend APIs (Updated)"
        UC2[User Certs API<br/>Uses Master Data]
        AA2[Admin API<br/>Uses Master Data]
        CA2[Catalog API<br/>Transforms Master Data]
        CMA2[Cert Master API<br/>Primary Source]
    end
    
    subgraph "Data Storage (Clean)"
        MCM2[mockCertificationMaster<br/>PRIMARY CATALOG]
        MC2[mockCertifications<br/>EMPTY - Clean Slate]
        MU2[mockUsers<br/>Reset Competency]
        MP2[mockPendingSubmissions<br/>EMPTY]
        TL[Transformation Layer]
    end
    
    D2 --> UC2
    C2 --> UC2
    A2 --> CA2
    A2 --> UC2
    U2 --> AA2
    AP2 --> AA2
    CM2 --> CMA2
    
    UC2 --> MC2
    UC2 --> TL
    AA2 --> MC2
    AA2 --> MU2
    CA2 --> TL
    CMA2 --> MCM2
    
    TL --> MCM2
    MC2 --> MU2
    
    style MCM2 fill:#4caf50
    style MC2 fill:#e0e0e0
    style TL fill:#2196f3
    style MP2 fill:#e0e0e0
```

## Migration Data Flow

```mermaid
sequenceDiagram
    participant Admin as Admin User
    participant System as Migration System
    participant Legacy as Legacy Data
    participant Master as Master Catalog
    participant Users as User Data
    
    Admin->>System: Initiate Migration
    
    note over System: Phase 1: Data Cleanup
    System->>Legacy: Backup mockCertificationTypes
    System->>Users: Clear userCertifications[]
    System->>Users: Reset competencyScores
    System->>Legacy: Clear mockCertifications
    System->>Legacy: Clear mockPendingSubmissions
    
    note over System: Phase 2: Master Data Integration
    System->>Master: Activate mockCertificationMaster
    System->>System: Create Transformation Layer
    
    note over System: Phase 3: API Updates
    System->>System: Update Catalog Endpoint
    System->>System: Update Assignment Endpoint
    System->>System: Update Approval Endpoint
    
    note over System: Phase 4: Frontend Updates
    System->>System: Update Component Data Sources
    System->>System: Update Type Definitions
    
    Admin->>System: Validation Complete
    System-->>Admin: Migration Successful
```

## Certification Lifecycle (Post-Migration)

```mermaid
stateDiagram-v2
    [*] --> MasterCatalog: Admin creates certification
    
    state MasterCatalog {
        [*] --> Active
        Active --> Inactive: Admin deactivates
        Inactive --> Active: Admin reactivates
        Active --> Retired: Set expiration date
    }
    
    MasterCatalog --> Assignment: Admin assigns to user
    MasterCatalog --> UserSubmission: User submits
    
    state Assignment {
        [*] --> AdminAssigned
        AdminAssigned --> PendingApproval: User completes
        AdminAssigned --> Cancelled: Admin cancels
    }
    
    state UserSubmission {
        [*] --> PendingApproval
        PendingApproval --> Active: Admin approves
        PendingApproval --> Rejected: Admin rejects
        Rejected --> PendingApproval: User resubmits
    }
    
    state Active {
        [*] --> Current
        Current --> ExpiringSoon: 30 days before expiry
        ExpiringSoon --> Expired: Past expiration
        ExpiringSoon --> Renewed: User renews
        Expired --> Renewed: User renews
    }
    
    Active --> [*]: User leaves company
    Cancelled --> [*]
    Rejected --> [*]: User gives up
```

## Data Transformation Architecture

```mermaid
graph LR
    subgraph "Master Data Structure"
        MCM[CertificationMaster<br/>- id<br/>- fullName<br/>- shortName<br/>- version<br/>- vendor: string<br/>- level<br/>- pointsValue<br/>- validityMonths<br/>- isActive]
    end
    
    subgraph "Transformation Layer"
        TF[Transform Function<br/>- Map fullName → name<br/>- Create vendor object<br/>- Calculate bonus eligibility<br/>- Apply business rules]
    end
    
    subgraph "Legacy Format"
        LF[Legacy Format<br/>- id<br/>- name<br/>- vendor: {name}<br/>- level<br/>- pointsValue<br/>- isBonusEligible<br/>- validityMonths<br/>- description]
    end
    
    subgraph "User Certification"
        UC[UserCertification<br/>- id<br/>- userId<br/>- certification: LegacyFormat<br/>- obtainedDate<br/>- expirationDate<br/>- status<br/>- assignment details]
    end
    
    MCM --> TF
    TF --> LF
    LF --> UC
    
    style MCM fill:#4caf50
    style TF fill:#2196f3
    style LF fill:#ff9800
    style UC fill:#9c27b0
```

## Integration Points Mapping

```mermaid
graph TB
    subgraph "Frontend Components"
        subgraph "User Interfaces"
            DU[Dashboard<br/>- Assigned certs display<br/>- Progress tracking]
            CU[Certifications<br/>- Status filtering<br/>- Assignment details]
            AU[Add Certification<br/>- Master catalog search<br/>- Deduplication logic]
        end
        
        subgraph "Admin Interfaces"
            UA[Users Admin<br/>- Assignment workflow<br/>- Cert management]
            APA[Approvals<br/>- Pending reviews<br/>- Master data validation]
            CMA[Cert Management<br/>- Master CRUD<br/>- Lifecycle management]
        end
    end
    
    subgraph "Backend Endpoints"
        subgraph "User APIs"
            UCAPI[GET/POST /certifications<br/>- User cert instances<br/>- Submission workflow]
            CAAPI[GET /certifications/catalog<br/>- Master data transform<br/>- Active filter]
        end
        
        subgraph "Admin APIs"
            AAAPI[/users/:id/assign-certification<br/>- Master data lookup<br/>- Assignment creation]
            APAPI[/admin/certifications/:id/status<br/>- Approval workflow<br/>- Master validation]
            CMAPI[/admin/certifications<br/>- Master CRUD<br/>- Direct access]
        end
    end
    
    subgraph "Data Layer"
        MCM2[Master Catalog<br/>mockCertificationMaster]
        MC2[User Instances<br/>mockCertifications]
        TL2[Transformation<br/>Business Logic]
    end
    
    DU --> UCAPI
    CU --> UCAPI
    AU --> CAAPI
    AU --> UCAPI
    
    UA --> AAAPI
    APA --> APAPI
    CMA --> CMAPI
    
    UCAPI --> MC2
    UCAPI --> TL2
    CAAPI --> TL2
    AAAPI --> TL2
    APAPI --> MC2
    APAPI --> TL2
    CMAPI --> MCM2
    
    TL2 --> MCM2
    MC2 -.-> MCM2
    
    style MCM2 fill:#4caf50
    style TL2 fill:#2196f3
    style MC2 fill:#ff9800
```

## Risk Mitigation Architecture

```mermaid
graph TB
    subgraph "Migration Process"
        B[Backup Creation<br/>- Complete data export<br/>- Rollback scripts]
        V[Validation Layer<br/>- Data integrity checks<br/>- Reference validation]
        M[Migration Engine<br/>- Phased execution<br/>- Error handling]
        T[Testing Framework<br/>- Automated tests<br/>- Manual validation]
    end
    
    subgraph "Safety Measures"
        FF[Feature Flags<br/>- Gradual rollout<br/>- Quick rollback]
        Mon[Monitoring<br/>- Performance tracking<br/>- Error detection]
        Log[Audit Logging<br/>- Change tracking<br/>- Compliance]
    end
    
    subgraph "Recovery Options"
        RB[Rollback Procedure<br/>- Data restoration<br/>- Service recovery]
        HS[Hotfix System<br/>- Quick patches<br/>- Emergency fixes]
        DR[Disaster Recovery<br/>- Backup systems<br/>- Data replication]
    end
    
    B --> V
    V --> M
    M --> T
    
    M --> FF
    M --> Mon
    M --> Log
    
    FF --> RB
    Mon --> HS
    Log --> DR
    
    style B fill:#4caf50
    style V fill:#2196f3
    style M fill:#ff9800
    style T fill:#9c27b0
```

## Deployment Strategy

```mermaid
gantt
    title Migration Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1: Preparation
    Data Backup           :2024-01-01, 2d
    Environment Setup     :2024-01-02, 2d
    Documentation        :2024-01-03, 2d
    
    section Phase 2: Core Migration
    Data Cleanup         :2024-01-08, 1d
    Master Integration   :2024-01-09, 2d
    API Updates         :2024-01-10, 2d
    Transform Layer     :2024-01-11, 1d
    
    section Phase 3: Frontend
    Component Updates   :2024-01-15, 3d
    Type Definitions   :2024-01-16, 1d
    UI Testing        :2024-01-17, 2d
    
    section Phase 4: Validation
    Integration Tests  :2024-01-22, 2d
    Performance Tests :2024-01-23, 2d
    User Acceptance   :2024-01-24, 3d
    
    section Phase 5: Production
    Staging Deployment :2024-01-29, 1d
    Production Deploy  :2024-01-30, 1d
    Monitoring        :2024-01-31, 7d
```

## Success Metrics Dashboard

```mermaid
pie title Migration Success Metrics
    "Data Integrity" : 25
    "Performance" : 20
    "User Experience" : 25
    "Business Continuity" : 20
    "System Reliability" : 10
```

## Post-Migration Architecture Benefits

```mermaid
mindmap
  root((Post-Migration Benefits))
    Data Quality
      Single Source of Truth
      Consistent Validation
      Improved Accuracy
    Admin Efficiency
      Centralized Management
      Bulk Operations
      Lifecycle Control
    User Experience
      Faster Search
      Better Deduplication
      Clearer Status
    System Performance
      Optimized Queries
      Reduced Redundancy
      Better Caching
    Future Scalability
      Modular Architecture
      API Consistency
      Extension Points