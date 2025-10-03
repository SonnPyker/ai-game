/**
 * Service tạo tên đa dạng cho nhân vật và NPC
 * Hỗ trợ nhiều thể loại và văn hóa khác nhau
 */

export interface NameGenerationOptions {
  gender?: 'male' | 'female' | 'neutral' | 'any';
  culture?: 'vietnamese' | 'japanese' | 'chinese' | 'korean' | 'western' | 'fantasy' | 'sci-fi' | 'medieval' | 'any';
  type?: 'first' | 'last' | 'full' | 'nickname' | 'title';
  length?: 'short' | 'medium' | 'long';
  style?: 'traditional' | 'modern' | 'unique' | 'classic';
}

export interface GeneratedName {
  name: string;
  meaning?: string;
  pronunciation?: string;
  culture: string;
  gender: string;
  type: string;
}

class NameGenerationService {
  private static instance: NameGenerationService;

  // Database tên theo văn hóa và giới tính
  private nameDatabase = {
    vietnamese: {
      male: {
        first: [
          'An', 'Bảo', 'Cường', 'Dũng', 'Đức', 'Giang', 'Hải', 'Hoàng', 'Hùng', 'Khải',
          'Lâm', 'Minh', 'Nam', 'Phong', 'Quang', 'Sơn', 'Tài', 'Thành', 'Tuấn', 'Việt',
          'Xuân', 'Yên', 'Bình', 'Chí', 'Đạt', 'Gia', 'Hiếu', 'Kiệt', 'Long', 'Nghĩa',
          'Phúc', 'Quốc', 'Tâm', 'Thắng', 'Vinh', 'Anh', 'Bình', 'Cảnh', 'Duy', 'Hưng'
        ],
        last: [
          'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi',
          'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Đào', 'Tô', 'Lưu', 'Chu',
          'Vương', 'Phùng', 'Tạ', 'Hà', 'Lương', 'Cao', 'Đoàn', 'Bạch', 'Dư', 'Hứa'
        ]
      },
      female: {
        first: [
          'An', 'Bảo', 'Chi', 'Diệu', 'Giang', 'Hà', 'Hương', 'Kiều', 'Lan', 'Mai',
          'Nga', 'Oanh', 'Phương', 'Quỳnh', 'Thảo', 'Uyên', 'Vy', 'Xuân', 'Yến', 'Bích',
          'Cẩm', 'Dung', 'Hạnh', 'Linh', 'Minh', 'Nhung', 'Phượng', 'Thanh', 'Thu', 'Vân',
          'Anh', 'Bình', 'Cúc', 'Đào', 'Hoa', 'Kim', 'Lệ', 'Mỹ', 'Nga', 'Phương'
        ],
        last: [
          'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi',
          'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Đào', 'Tô', 'Lưu', 'Chu',
          'Vương', 'Phùng', 'Tạ', 'Hà', 'Lương', 'Cao', 'Đoàn', 'Bạch', 'Dư', 'Hứa'
        ]
      }
    },
    japanese: {
      male: {
        first: [
          'Hiroshi', 'Takeshi', 'Kenji', 'Yuki', 'Satoru', 'Daiki', 'Ryo', 'Kenta', 'Shinji', 'Masato',
          'Kazuki', 'Taro', 'Jiro', 'Saburo', 'Ichiro', 'Akira', 'Hideo', 'Toshi', 'Masa', 'Nobu',
          'Sho', 'Taku', 'Yuji', 'Kazu', 'Masa', 'Taka', 'Hiro', 'Sho', 'Kazu', 'Taka'
        ],
        last: [
          'Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato',
          'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Yamazaki',
          'Mori', 'Abe', 'Ikeda', 'Hashimoto', 'Yamashita', 'Aoki', 'Fujita', 'Nishimura', 'Fukuda', 'Ota'
        ]
      },
      female: {
        first: [
          'Yuki', 'Sakura', 'Hana', 'Aoi', 'Mai', 'Rin', 'Emi', 'Yui', 'Mio', 'Saki',
          'Nana', 'Mika', 'Rika', 'Akiko', 'Yoko', 'Keiko', 'Naoko', 'Michiko', 'Noriko', 'Tomoko',
          'Ayaka', 'Rika', 'Mika', 'Saki', 'Nana', 'Yui', 'Mio', 'Rin', 'Emi', 'Hana'
        ],
        last: [
          'Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato',
          'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Yamazaki',
          'Mori', 'Abe', 'Ikeda', 'Hashimoto', 'Yamashita', 'Aoki', 'Fujita', 'Nishimura', 'Fukuda', 'Ota'
        ]
      }
    },
    chinese: {
      male: {
        first: [
          'Wei', 'Ming', 'Jian', 'Feng', 'Long', 'Hao', 'Jun', 'Lei', 'Tian', 'Kang',
          'Xin', 'Yong', 'Qiang', 'Bin', 'Hui', 'Jie', 'Kai', 'Lin', 'Peng', 'Qing',
          'Rui', 'Shan', 'Tao', 'Wen', 'Xiang', 'Yan', 'Zhi', 'An', 'Bo', 'Cheng'
        ],
        last: [
          'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou',
          'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo', 'He', 'Gao', 'Lin', 'Luo',
          'Zheng', 'Liang', 'Xie', 'Song', 'Tang', 'Xu', 'Han', 'Deng', 'Cao', 'Peng'
        ]
      },
      female: {
        first: [
          'Mei', 'Li', 'Hua', 'Fang', 'Ling', 'Xin', 'Yan', 'Jing', 'Qing', 'Xia',
          'Yu', 'Lan', 'Ping', 'Hong', 'Xiu', 'Ying', 'Feng', 'Xue', 'Yue', 'Zhen',
          'Ai', 'Bing', 'Chun', 'Dan', 'E', 'Fen', 'Gao', 'Hui', 'Jia', 'Kang'
        ],
        last: [
          'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou',
          'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo', 'He', 'Gao', 'Lin', 'Luo',
          'Zheng', 'Liang', 'Xie', 'Song', 'Tang', 'Xu', 'Han', 'Deng', 'Cao', 'Peng'
        ]
      }
    },
    korean: {
      male: {
        first: [
          'Min-jun', 'Seung-ho', 'Jae-hyun', 'Dong-hyun', 'Sang-hoon', 'Ji-hoon', 'Tae-hyun', 'Hyun-woo', 'Jin-woo', 'Seung-woo',
          'Min-ho', 'Jae-sung', 'Dong-wook', 'Sang-min', 'Ji-sung', 'Tae-min', 'Hyun-jun', 'Jin-sung', 'Seung-jun', 'Min-sung',
          'Jae-woo', 'Dong-min', 'Sang-hyun', 'Ji-woo', 'Tae-sung', 'Hyun-min', 'Jin-hyun', 'Seung-min', 'Min-woo', 'Jae-min'
        ],
        last: [
          'Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim',
          'Han', 'Oh', 'Seo', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Shin', 'Yoo', 'Bae',
          'Moon', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Oh', 'Seo'
        ]
      },
      female: {
        first: [
          'Min-jung', 'Seung-hee', 'Jae-young', 'Dong-hee', 'Sang-mi', 'Ji-young', 'Tae-hee', 'Hyun-jung', 'Jin-young', 'Seung-young',
          'Min-hee', 'Jae-mi', 'Dong-mi', 'Sang-young', 'Ji-mi', 'Tae-young', 'Hyun-mi', 'Jin-mi', 'Seung-mi', 'Min-young',
          'Jae-hee', 'Dong-young', 'Sang-hee', 'Ji-hee', 'Tae-mi', 'Hyun-young', 'Jin-hee', 'Seung-hee', 'Min-mi', 'Jae-young'
        ],
        last: [
          'Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim',
          'Han', 'Oh', 'Seo', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Shin', 'Yoo', 'Bae',
          'Moon', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Oh', 'Seo'
        ]
      }
    },
    western: {
      male: {
        first: [
          'Alexander', 'Benjamin', 'Christopher', 'Daniel', 'Ethan', 'Gabriel', 'Henry', 'Isaac', 'James', 'Liam',
          'Michael', 'Noah', 'Oliver', 'Patrick', 'Quinn', 'Ryan', 'Samuel', 'Thomas', 'William', 'Zachary',
          'Aaron', 'Brandon', 'Caleb', 'David', 'Edward', 'Felix', 'George', 'Hunter', 'Ian', 'Jack'
        ],
        last: [
          'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
          'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
          'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
        ]
      },
      female: {
        first: [
          'Abigail', 'Bella', 'Charlotte', 'Diana', 'Emma', 'Fiona', 'Grace', 'Hannah', 'Isabella', 'Julia',
          'Katherine', 'Lily', 'Mia', 'Natalie', 'Olivia', 'Penelope', 'Quinn', 'Ruby', 'Sophia', 'Tessa',
          'Victoria', 'Willow', 'Xara', 'Yara', 'Zoe', 'Amelia', 'Brianna', 'Chloe', 'Diana', 'Elena'
        ],
        last: [
          'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
          'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
          'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
        ]
      }
    },
    fantasy: {
      male: {
        first: [
          'Aragorn', 'Gandalf', 'Legolas', 'Gimli', 'Boromir', 'Faramir', 'Eomer', 'Theoden', 'Elrond', 'Thranduil',
          'Bilbo', 'Frodo', 'Samwise', 'Peregrin', 'Meriadoc', 'Gollum', 'Sauron', 'Saruman', 'Wormtongue', 'Grima',
          'Aragorn', 'Legolas', 'Gimli', 'Boromir', 'Faramir', 'Eomer', 'Theoden', 'Elrond', 'Thranduil', 'Bilbo'
        ],
        last: [
          'Stormwind', 'Ironforge', 'Darnassus', 'Thunder Bluff', 'Undercity', 'Silvermoon', 'Exodar', 'Shattrath', 'Dalaran', 'Stormwind',
          'Ironforge', 'Darnassus', 'Thunder Bluff', 'Undercity', 'Silvermoon', 'Exodar', 'Shattrath', 'Dalaran', 'Stormwind', 'Ironforge'
        ]
      },
      female: {
        first: [
          'Arwen', 'Eowyn', 'Galadriel', 'Luthien', 'Nimrodel', 'Tauriel', 'Celebrian', 'Idril', 'Aredhel', 'Nerdanel',
          'Yavanna', 'Varda', 'Nienna', 'Estë', 'Vairë', 'Nessa', 'Vána', 'Námo', 'Irmo', 'Oromë',
          'Tulkas', 'Ulmo', 'Aulë', 'Manwë', 'Varda', 'Yavanna', 'Nienna', 'Estë', 'Vairë', 'Nessa'
        ],
        last: [
          'Evenstar', 'Shieldmaiden', 'Lady of Light', 'Elvenqueen', 'Maid of the Golden Wood', 'Elven Princess', 'Elven Lady', 'Elven Queen', 'Elven Princess', 'Elven Lady',
          'Evenstar', 'Shieldmaiden', 'Lady of Light', 'Elvenqueen', 'Maid of the Golden Wood', 'Elven Princess', 'Elven Lady', 'Elven Queen', 'Elven Princess', 'Elven Lady'
        ]
      }
    },
    'sci-fi': {
      male: {
        first: [
          'Zephyr', 'Nexus', 'Quantum', 'Vector', 'Matrix', 'Photon', 'Nebula', 'Cosmos', 'Stellar', 'Galaxy',
          'Orbit', 'Void', 'Prism', 'Crystal', 'Fusion', 'Plasma', 'Neon', 'Cyber', 'Digital', 'Binary',
          'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'
        ],
        last: [
          'Prime', 'Nexus', 'Vector', 'Matrix', 'Quantum', 'Photon', 'Nebula', 'Cosmos', 'Stellar', 'Galaxy',
          'Orbit', 'Void', 'Prism', 'Crystal', 'Fusion', 'Plasma', 'Neon', 'Cyber', 'Digital', 'Binary'
        ]
      },
      female: {
        first: [
          'Nova', 'Aurora', 'Luna', 'Stella', 'Vega', 'Lyra', 'Cassiopeia', 'Andromeda', 'Pleiades', 'Orion',
          'Sirius', 'Rigel', 'Betelgeuse', 'Antares', 'Aldebaran', 'Spica', 'Arcturus', 'Capella', 'Procyon', 'Pollux',
          'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'
        ],
        last: [
          'Prime', 'Nexus', 'Vector', 'Matrix', 'Quantum', 'Photon', 'Nebula', 'Cosmos', 'Stellar', 'Galaxy',
          'Orbit', 'Void', 'Prism', 'Crystal', 'Fusion', 'Plasma', 'Neon', 'Cyber', 'Digital', 'Binary'
        ]
      }
    },
    medieval: {
      male: {
        first: [
          'Arthur', 'Lancelot', 'Galahad', 'Percival', 'Gawain', 'Tristan', 'Bedivere', 'Kay', 'Bors', 'Ector',
          'Mordred', 'Agravain', 'Gaheris', 'Gareth', 'Lionel', 'Palamedes', 'Sagramore', 'Dinadan', 'Lamorak', 'Pelleas',
          'William', 'Richard', 'Henry', 'Edward', 'John', 'Robert', 'Thomas', 'James', 'Charles', 'George'
        ],
        last: [
          'of Camelot', 'the Brave', 'the Bold', 'the Strong', 'the Wise', 'the Just', 'the Noble', 'the Valiant', 'the Gallant', 'the Chivalrous',
          'of the Round Table', 'of the Sword', 'of the Shield', 'of the Lance', 'of the Cross', 'of the Crown', 'of the Throne', 'of the Realm', 'of the Kingdom', 'of the Empire'
        ]
      },
      female: {
        first: [
          'Guinevere', 'Morgana', 'Nimue', 'Viviane', 'Igraine', 'Elaine', 'Isolde', 'Briseis', 'Andromache', 'Hecuba',
          'Penelope', 'Helen', 'Clytemnestra', 'Electra', 'Antigone', 'Ismene', 'Jocasta', 'Medea', 'Circe', 'Calypso',
          'Eleanor', 'Isabella', 'Margaret', 'Joan', 'Catherine', 'Mary', 'Elizabeth', 'Anne', 'Jane', 'Philippa'
        ],
        last: [
          'of Camelot', 'the Fair', 'the Beautiful', 'the Wise', 'the Noble', 'the Pure', 'the Chaste', 'the Virtuous', 'the Gracious', 'the Gentle',
          'of the Lake', 'of the Forest', 'of the Mountain', 'of the Valley', 'of the River', 'of the Sea', 'of the Sky', 'of the Earth', 'of the Moon', 'of the Sun'
        ]
      }
    }
  };

  // Từ điển ý nghĩa tên
  private nameMeanings = {
    vietnamese: {
      'An': 'Bình an, yên tĩnh',
      'Bảo': 'Quý báu, bảo vệ',
      'Cường': 'Mạnh mẽ, kiên cường',
      'Dũng': 'Dũng cảm, can đảm',
      'Đức': 'Đức độ, phẩm chất tốt',
      'Giang': 'Sông lớn, rộng lớn',
      'Hải': 'Biển cả, rộng lớn',
      'Hoàng': 'Vàng, quý giá',
      'Hùng': 'Hùng mạnh, oai phong',
      'Khải': 'Khải hoàn, chiến thắng',
      'Lâm': 'Rừng, thiên nhiên',
      'Minh': 'Sáng suốt, thông minh',
      'Nam': 'Phương nam, nam giới',
      'Phong': 'Gió, phong cách',
      'Quang': 'Ánh sáng, rạng rỡ',
      'Sơn': 'Núi, vững chãi',
      'Tài': 'Tài năng, khả năng',
      'Thành': 'Thành công, hoàn thành',
      'Tuấn': 'Tuấn tú, đẹp trai',
      'Việt': 'Việt Nam, vượt trội'
    },
    japanese: {
      'Hiroshi': 'Rộng lớn, bao la',
      'Takeshi': 'Mạnh mẽ, kiên cường',
      'Kenji': 'Kiến thức, trí tuệ',
      'Yuki': 'Tuyết, thanh khiết',
      'Satoru': 'Hiểu biết, giác ngộ',
      'Daiki': 'Vĩ đại, to lớn',
      'Ryo': 'Tốt, xuất sắc',
      'Kenta': 'Kiên cường, mạnh mẽ',
      'Shinji': 'Chân lý, thật',
      'Masato': 'Chính trực, ngay thẳng'
    },
    fantasy: {
      'Aragorn': 'Vua của rừng',
      'Gandalf': 'Elf với cây gậy',
      'Legolas': 'Lá xanh',
      'Gimli': 'Người lùn dũng cảm',
      'Boromir': 'Người đá quý',
      'Faramir': 'Người đá quý xa',
      'Eomer': 'Ngựa chiến',
      'Theoden': 'Vua của nhân dân',
      'Elrond': 'Vòm sao',
      'Thranduil': 'Vua rừng xanh'
    }
  };

  // Từ điển phát âm
  private pronunciations = {
    vietnamese: {
      'Nguyễn': 'Ngu-yên',
      'Trần': 'Trân',
      'Lê': 'Lê',
      'Phạm': 'Phạm',
      'Hoàng': 'Hoàng'
    },
    japanese: {
      'Hiroshi': 'Hi-rô-shi',
      'Takeshi': 'Ta-kê-shi',
      'Kenji': 'Kên-ji',
      'Yuki': 'Yu-ki',
      'Satoru': 'Sa-tô-ru'
    }
  };

  public static getInstance(): NameGenerationService {
    if (!NameGenerationService.instance) {
      NameGenerationService.instance = new NameGenerationService();
    }
    return NameGenerationService.instance;
  }

  /**
   * Tạo tên theo các tùy chọn
   */
  public generateName(options: NameGenerationOptions = {}): GeneratedName {
    const {
      gender = 'any',
      culture = 'any',
      type = 'full',
      length = 'medium'
    } = options;

    // Chọn văn hóa ngẫu nhiên nếu 'any'
    const selectedCulture = culture === 'any' 
      ? this.getRandomCulture() 
      : culture;

    // Chọn giới tính ngẫu nhiên nếu 'any'
    const selectedGender = gender === 'any' 
      ? (Math.random() < 0.5 ? 'male' : 'female')
      : gender;

    // Lấy database tên
    const cultureData = this.nameDatabase[selectedCulture as keyof typeof this.nameDatabase];
    if (!cultureData) {
      throw new Error(`Văn hóa không được hỗ trợ: ${selectedCulture}`);
    }

    const genderData = cultureData[selectedGender as keyof typeof cultureData];
    if (!genderData) {
      throw new Error(`Giới tính không được hỗ trợ: ${selectedGender}`);
    }

    let generatedName: string;
    let nameType: string;

    switch (type) {
      case 'first':
        generatedName = this.getRandomName(genderData.first, length);
        nameType = 'Tên';
        break;
      case 'last':
        generatedName = this.getRandomName(genderData.last, length);
        nameType = 'Họ';
        break;
      case 'full':
        const firstName = this.getRandomName(genderData.first, length);
        const lastName = this.getRandomName(genderData.last, length);
        generatedName = `${firstName} ${lastName}`;
        nameType = 'Họ và tên';
        break;
      case 'nickname':
        generatedName = this.generateNickname(genderData.first, selectedCulture);
        nameType = 'Biệt danh';
        break;
      case 'title':
        generatedName = this.generateTitle(selectedCulture, selectedGender);
        nameType = 'Danh hiệu';
        break;
      default:
        generatedName = this.getRandomName(genderData.first, length);
        nameType = 'Tên';
    }

    return {
      name: generatedName,
      meaning: this.getNameMeaning(generatedName, selectedCulture),
      pronunciation: this.getPronunciation(generatedName, selectedCulture),
      culture: selectedCulture,
      gender: selectedGender,
      type: nameType
    };
  }

  /**
   * Tạo nhiều tên cùng lúc
   */
  public generateMultipleNames(count: number, options: NameGenerationOptions = {}): GeneratedName[] {
    const names: GeneratedName[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let name: GeneratedName;

      do {
        name = this.generateName(options);
        attempts++;
      } while (usedNames.has(name.name) && attempts < 10);

      if (!usedNames.has(name.name)) {
        names.push(name);
        usedNames.add(name.name);
      }
    }

    return names;
  }

  /**
   * Tạo tên theo thể loại game
   */
  public generateNameForGenre(genre: string, gender: 'male' | 'female' | 'any' = 'any'): GeneratedName {
    const genreMapping: { [key: string]: 'vietnamese' | 'japanese' | 'chinese' | 'korean' | 'western' | 'fantasy' | 'sci-fi' | 'medieval' } = {
      'fantasy': 'fantasy',
      'sci-fi': 'sci-fi',
      'medieval': 'medieval',
      'modern': 'western',
      'vietnamese': 'vietnamese',
      'japanese': 'japanese',
      'chinese': 'chinese',
      'korean': 'korean'
    };

    const culture = genreMapping[genre.toLowerCase()] || 'western';
    return this.generateName({ culture, gender, type: 'full' });
  }

  /**
   * Tạo tên NPC với thông tin bổ sung
   */
  public generateNPCName(role: string, faction?: string, gender: 'male' | 'female' | 'any' = 'any'): GeneratedName {
    // Chọn văn hóa dựa trên vai trò và phe phái
    let culture = 'western';
    
    if (faction) {
      const factionLower = faction.toLowerCase();
      if (factionLower.includes('vietnam') || factionLower.includes('việt')) {
        culture = 'vietnamese';
      } else if (factionLower.includes('japan') || factionLower.includes('nhật')) {
        culture = 'japanese';
      } else if (factionLower.includes('china') || factionLower.includes('trung')) {
        culture = 'chinese';
      } else if (factionLower.includes('korea') || factionLower.includes('hàn')) {
        culture = 'korean';
      } else if (factionLower.includes('fantasy') || factionLower.includes('fantasy')) {
        culture = 'fantasy';
      } else if (factionLower.includes('sci-fi') || factionLower.includes('khoa học')) {
        culture = 'sci-fi';
      } else if (factionLower.includes('medieval') || factionLower.includes('trung cổ')) {
        culture = 'medieval';
      }
    }

    // Chọn kiểu tên dựa trên vai trò
    let type: 'first' | 'last' | 'full' | 'nickname' | 'title' = 'full';
    if (role.toLowerCase().includes('king') || role.toLowerCase().includes('vua')) {
      type = 'title';
    } else if (role.toLowerCase().includes('nickname') || role.toLowerCase().includes('biệt danh')) {
      type = 'nickname';
    }

    return this.generateName({ culture: culture as any, gender, type });
  }

  /**
   * Lấy tên ngẫu nhiên từ danh sách
   */
  private getRandomName(names: string[], length: 'short' | 'medium' | 'long'): string {
    let filteredNames = names;

    // Lọc theo độ dài
    if (length === 'short') {
      filteredNames = names.filter(name => name.length <= 4);
    } else if (length === 'long') {
      filteredNames = names.filter(name => name.length >= 8);
    } else {
      filteredNames = names.filter(name => name.length >= 5 && name.length <= 7);
    }

    if (filteredNames.length === 0) {
      filteredNames = names;
    }

    return filteredNames[Math.floor(Math.random() * filteredNames.length)];
  }

  /**
   * Tạo biệt danh
   */
  private generateNickname(firstName: string[], culture: string): string {
    const nicknames: { [key: string]: string[] } = {
      vietnamese: ['Bé', 'Anh', 'Chị', 'Em', 'Cậu', 'Cô', 'Chú', 'Bác'],
      japanese: ['-kun', '-chan', '-san', '-sama', '-senpai'],
      western: ['Junior', 'Senior', 'Big', 'Little', 'Old', 'Young'],
      fantasy: ['the Brave', 'the Wise', 'the Strong', 'the Swift', 'the Bold']
    };

    const baseName = this.getRandomName(firstName, 'medium');
    const nicknameList = nicknames[culture] || nicknames.western;
    const nickname = nicknameList[Math.floor(Math.random() * nicknameList.length)];

    return culture === 'japanese' ? `${baseName}${nickname}` : `${nickname} ${baseName}`;
  }

  /**
   * Tạo danh hiệu
   */
  private generateTitle(culture: string, gender: string): string {
    const titles: { [key: string]: { [key: string]: string[] } } = {
      vietnamese: {
        male: ['Vua', 'Hoàng đế', 'Tướng quân', 'Lãnh chúa', 'Hiệp sĩ'],
        female: ['Nữ hoàng', 'Hoàng hậu', 'Công chúa', 'Nữ tướng', 'Hiệp sĩ nữ']
      },
      japanese: {
        male: ['Shogun', 'Daimyo', 'Samurai', 'Sensei', 'Sama'],
        female: ['Shogun', 'Daimyo', 'Samurai', 'Sensei', 'Sama']
      },
      western: {
        male: ['King', 'Emperor', 'Duke', 'Earl', 'Knight'],
        female: ['Queen', 'Empress', 'Duchess', 'Countess', 'Knight']
      },
      fantasy: {
        male: ['King', 'Emperor', 'Duke', 'Earl', 'Knight', 'Wizard', 'Mage'],
        female: ['Queen', 'Empress', 'Duchess', 'Countess', 'Knight', 'Witch', 'Enchantress']
      }
    };

    const cultureTitles = titles[culture] || titles.western;
    const genderTitles = cultureTitles[gender] || cultureTitles.male;
    
    return genderTitles[Math.floor(Math.random() * genderTitles.length)];
  }

  /**
   * Lấy ý nghĩa tên
   */
  private getNameMeaning(name: string, culture: string): string | undefined {
    const cultureMeanings = this.nameMeanings[culture as keyof typeof this.nameMeanings];
    if (!cultureMeanings) return undefined;

    // Tìm tên trong từ điển ý nghĩa
    for (const [key, meaning] of Object.entries(cultureMeanings)) {
      if (name.includes(key)) {
        return meaning as string;
      }
    }

    return undefined;
  }

  /**
   * Lấy phát âm
   */
  private getPronunciation(name: string, culture: string): string | undefined {
    const culturePronunciations = this.pronunciations[culture as keyof typeof this.pronunciations];
    if (!culturePronunciations) return undefined;

    // Tìm tên trong từ điển phát âm
    for (const [key, pronunciation] of Object.entries(culturePronunciations)) {
      if (name.includes(key)) {
        return pronunciation as string;
      }
    }

    return undefined;
  }

  /**
   * Chọn văn hóa ngẫu nhiên
   */
  private getRandomCulture(): string {
    const cultures = Object.keys(this.nameDatabase);
    return cultures[Math.floor(Math.random() * cultures.length)];
  }

  /**
   * Lấy danh sách văn hóa có sẵn
   */
  public getAvailableCultures(): string[] {
    return Object.keys(this.nameDatabase);
  }

  /**
   * Lấy danh sách giới tính có sẵn
   */
  public getAvailableGenders(): string[] {
    return ['male', 'female', 'any'];
  }

  /**
   * Lấy danh sách loại tên có sẵn
   */
  public getAvailableTypes(): string[] {
    return ['first', 'last', 'full', 'nickname', 'title'];
  }
}

export const nameGenerationService = NameGenerationService.getInstance();
