# Tank Hardpoint Architecture

The smallest historically credible Allied Normandy hardpoint model is:

- hull family
- turret family
- main gun
- secondary weapons
- engine bay
- transmission
- suspension
- radio bay
- optics
- armor package
- special equipment
- crew access
- external stowage

That is enough to represent the Normandy Shermans, Fireflies, DD tanks, M10s, M18s, M36s, Churchills, Cromwells, Stuarts, and M32 recovery vehicles without turning every tank into a bespoke one-off.

## Design Rule

A component belongs in the system if it changes at least one of:

- visibility
- information access
- mobility
- survivability
- firepower
- reliability

## Layer Model

### 1. Hull Family
The hull defines the chassis, internal volume, engine family, suspension family, and basic survivability.

### 2. Turret Family
The turret defines gun mount, commander visibility, loader access, ammunition handling, and top-side exposure.

### 3. Weapon Slots
Main gun and secondary weapons are swappable within compatibility families.

### 4. Mobility Stack
Engine, transmission, and suspension are separate modules so a tank can be slow but tough, or fast but fragile.

### 5. Information Stack
Radio and optics are explicit because Normandy armor was an information problem as much as a firepower problem.

### 6. Protection Stack
Armor packages, wet stowage, and field armor change survivability without creating new hulls.

### 7. Special Equipment
DD screens, Rhino cutters, recovery booms, muzzle brakes, and similar field gear are special equipment hardpoints.

### 8. Crew Access and Stowage
Hatches, cupolas, loader access, and external stowage alter how fast the crew can see, reload, survive, and fight.

## Swapping Rules

- Factory swaps are higher confidence and usually vehicle-family specific.
- Field swaps are slower, riskier, and may reduce reliability.
- Conversion kits should be modeled as component bundles, not magic stats.
- If a field kit changes silhouette, it also changes spotting and identification.

## Simulation Consequences

- A Firefly is not just a Sherman with a bigger gun; it is a different information and reload problem.
- A DD tank is not just a Sherman with flotation; launch timing is a pre-contact state machine.
- A Churchill is not just slow; it is a different breach-and-support doctrine.
- An M32 is not a combat tank; it is a throughput machine for damaged armor.
