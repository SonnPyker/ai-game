# 📊 CoreStats và Modifier Effects Guide

## 🏃‍♂️ **STRENGTH (Sức mạnh)**
- **Modifier**: `Math.floor((strength - 10) / 2)`
- **Ảnh hưởng**:
  - **Attack Bonus**: Cộng trực tiếp vào attack roll
  - **Damage**: Không ảnh hưởng trực tiếp (chỉ weapon damage)
  - **Carrying Capacity**: Không implement trong game hiện tại

## ⚡ **AGILITY (Nhanh nhẹn)**
- **Modifier**: `Math.floor((agility - 10) / 2)`
- **Ảnh hưởng**:
  - **Initiative**: Cộng vào initiative roll
  - **AC**: Không ảnh hưởng trực tiếp (chỉ equipment)
  - **Dodge**: Không implement trong game hiện tại

## 🧠 **INTELLIGENCE (Trí tuệ)**
- **Modifier**: `Math.floor((intelligence - 10) / 2)`
- **Ảnh hưởng**:
  - **Skill Points**: Không ảnh hưởng trực tiếp
  - **Magic**: Không implement trong game hiện tại
  - **Social Skills**: Có thể ảnh hưởng qua skill tree

## 💪 **CONSTITUTION (Thể chất)**
- **Modifier**: `Math.floor((constitution - 10) / 2)`
- **Ảnh hưởng**:
  - **Base HP**: `CON modifier + 20` (từ character creation)
  - **HP per Level**: Không ảnh hưởng (đã loại bỏ)
  - **Saving Throws**: Không implement trong game hiện tại

## 👁️ **WISDOM (Khôn ngoan)**
- **Modifier**: `Math.floor((wisdom - 10) / 2)`
- **Ảnh hưởng**:
  - **Perception**: Không implement trong game hiện tại
  - **Saving Throws**: Không implement trong game hiện tại
  - **Social Skills**: Có thể ảnh hưởng qua skill tree

## 💬 **CHARISMA (Sức hút)**
- **Modifier**: `Math.floor((charisma - 10) / 2)`
- **Ảnh hưởng**:
  - **Social Interactions**: Có thể ảnh hưởng qua skill tree
  - **NPC Relationships**: Có thể ảnh hưởng qua skill tree
  - **Shop Prices**: Có thể ảnh hưởng qua skill tree

## 🛡️ **ARMOR CLASS (AC)**
- **Base**: 10
- **Ảnh hưởng**:
  - **Equipment**: Cộng từ armor
  - **Skill Tree**: Cộng từ combat skills
  - **Status Effects**: Cộng từ buffs/debuffs

---

## 🎯 **Combat Calculations**

### **Attack Bonus**:
```
Base Attack = Strength Modifier + Equipment Bonus + Skill Tree Bonus + Status Effects
```

### **Damage**:
```
Base Damage = Weapon Damage + Skill Tree Damage Bonus + Status Effects
```

### **HP Calculation**:
```
Base HP = Constitution Modifier + 20
Combat HP Bonus = Math.floor((Combat Level - 1) / 3) * 7
Total HP = Base HP + Combat HP Bonus
```

### **Initiative**:
```
Initiative = Agility Modifier + Skill Tree Bonus + Status Effects
```

---

## 🌟 **Skill Tree Integration**

### **Combat Skills**:
- **Attack Bonus**: Cộng trực tiếp vào attack roll
- **Damage Bonus**: Cộng vào weapon damage (dice notation)
- **AC Bonus**: Cộng vào armor class
- **Initiative Bonus**: Cộng vào initiative
- **Critical Chance**: Tăng % critical hit

### **Social Skills**:
- **Stat Bonuses**: Cộng trực tiếp vào core stats
- **Shop Price Modifier**: Giảm giá mua hàng
- **Sell Price Modifier**: Tăng giá bán hàng
- **Reputation Gain**: Tăng reputation gain rate
- **Relationship Gain**: Tăng relationship gain rate

---

## 📈 **Level Progression**

### **Combat Level**:
- **Level 1**: 1 Combat Skill Point
- **Level 2**: 2 Combat Skill Points  
- **Level 3**: 3 Combat Skill Points
- **Mỗi 3 levels**: +7 HP
- **Skill Points**: Dùng cho combat skills

### **Character Level**:
- **Level 1**: 1 Social Skill Point
- **Level 2**: 2 Social Skill Points
- **Level 3**: 3 Social Skill Points
- **Skill Points**: Dùng cho social skills

---

## 🔧 **Technical Implementation**

### **Modifier Calculation**:
```typescript
const modifier = Math.floor((stat - 10) / 2);
```

### **HP Recalculation** (khi Constitution thay đổi):
```typescript
const baseHp = constitutionModifier + 20;
const combatHpBonus = Math.floor((combatLevel - 1) / 3) * 7;
const totalHp = baseHp + combatHpBonus;
```

### **Skill Tree Bonuses**:
- **Stat Bonuses**: Áp dụng trực tiếp vào `coreStats`
- **Combat Bonuses**: Áp dụng qua `temporaryPlayerStats` trong combat
- **Social Bonuses**: Áp dụng trong `inventoryService` và `npcRelationshipService`

---

## 📝 **Notes**

- **Character Level** không ảnh hưởng đến HP nữa
- **Constitution** chỉ ảnh hưởng đến base HP, không phải HP per level
- **Skill Tree** là cách chính để tăng stats và bonuses
- **Combat Level** chỉ ảnh hưởng đến HP bonus và combat skill points
- **Social Level** chỉ ảnh hưởng đến social skill points
