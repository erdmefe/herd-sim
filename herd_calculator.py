from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List
import json
import sys
import random
from dateutil.relativedelta import relativedelta

@dataclass
class Cow:
    is_pregnant: bool
    months_until_birth: int = None
    months_until_next_pregnancy: int = None
    is_milking: bool = False
    has_given_birth: bool = False  # Hiç doğum yapıp yapmadığını takip etmek için

@dataclass
class Calf:
    is_female: bool
    age_months: int = 0
    birth_date: datetime = None

class HerdManager:
    def __init__(self, initial_cow_count=10, initial_pregnancy_month=6, 
                 monthly_new_cows=1, new_cow_pregnancy_month=6, 
                 milking_threshold=2, calf_maturity_age=14,
                 male_calf_removal_age=6, birth_success_rate=95,
                 use_female_sperm=False, start_year=2026, start_month=9,
                 post_birth_wait=2, milk_per_cow=25, milk_price=21,
                 feed_cost_per_cow=150, other_expenses=25000,
                 male_calf_price=15000, calf_feed_ratio=0.2):
        self.cows: List[Cow] = []
        self.calves: List[Calf] = []
        self.current_date = datetime(start_year, start_month, 1)
        self.total_removed_male_calves = 0
        
        # Configuration parameters
        self.monthly_new_cows = monthly_new_cows
        self.new_cow_pregnancy_month = new_cow_pregnancy_month
        self.milking_threshold = milking_threshold
        self.calf_maturity_age = calf_maturity_age
        self.male_calf_removal_age = male_calf_removal_age
        self.birth_success_rate = birth_success_rate
        self.use_female_sperm = use_female_sperm
        self.post_birth_wait = post_birth_wait
        
        # Gelir/gider parametreleri
        self.milk_per_cow = milk_per_cow  # Günlük süt üretimi (lt)
        self.milk_price = milk_price  # Süt litre fiyatı (TL)
        self.feed_cost_per_cow = feed_cost_per_cow  # Günlük yem maliyeti (TL)
        self.other_expenses = other_expenses  # Aylık diğer giderler (TL)
        self.male_calf_price = male_calf_price  # Erkek buzağı satış fiyatı (TL)
        self.calf_feed_ratio = calf_feed_ratio  # Buzağı yem oranı (0-1 arası)
        
        # Initialize with initial cows - Başlangıçtaki inekler doğum yapmış kabul edilir
        for _ in range(initial_cow_count):
            if initial_pregnancy_month == 'random':
                preg_month = random.randint(1, 9)
            else:
                preg_month = initial_pregnancy_month
                
            months_until_birth = 9 - preg_month + 1
            self.cows.append(Cow(
                is_pregnant=True,
                months_until_birth=months_until_birth,
                is_milking=months_until_birth > self.milking_threshold,
                has_given_birth=True  # Başlangıçtaki inekler doğum yapmış kabul edilir
            ))

    def add_monthly_cow(self):
        # Add new pregnant cows based on configuration - Aylık eklenen inekler doğum yapmış kabul edilir
        for _ in range(self.monthly_new_cows):
            if self.new_cow_pregnancy_month == 'random':
                preg_month = random.randint(1, 9)
            else:
                preg_month = self.new_cow_pregnancy_month
                
            months_until_birth = 9 - preg_month + 1
            new_cow = Cow(
                is_pregnant=True,
                months_until_birth=months_until_birth,
                is_milking=months_until_birth > self.milking_threshold,
                has_given_birth=True  # Aylık eklenen inekler doğum yapmış kabul edilir
            )
            self.cows.append(new_cow)

    def process_month(self):
        # Process existing cows
        new_calves = []
        
        for cow in self.cows:
            if cow.is_pregnant:
                cow.months_until_birth -= 1
                
                if cow.months_until_birth <= 0:  # Doğum zamanı
                    # Doğum başarı kontrolü
                    birth_success = random.random() * 100 < self.birth_success_rate
                    
                    if birth_success:
                        # Başarılı doğum - buzağılama işlemi
                        female_probability = 0.9 if self.use_female_sperm else 0.5
                        is_female = random.random() < female_probability
                        new_calves.append(Calf(
                            is_female=is_female,
                            age_months=0,
                            birth_date=self.current_date
                        ))
                        cow.has_given_birth = True  # İlk doğumunu yaptı
                        cow.is_milking = True  # Doğum sonrası sağmal olur
                    
                    # Doğum sonrası inek durumu güncelleme (başarılı veya başarısız)
                    cow.is_pregnant = False
                    cow.months_until_birth = None
                    cow.months_until_next_pregnancy = self.post_birth_wait  # Kullanıcı tarafından belirlenen bekleme süresi
                
                elif cow.months_until_birth <= self.milking_threshold:
                    cow.is_milking = False  # Doğuma yakın dönemde sağmal değil
                else:
                    # Sadece daha önce doğum yapmış inekler sağmal olabilir
                    cow.is_milking = cow.has_given_birth
            
            else:  # Gebe olmayan inekler
                if cow.months_until_next_pregnancy is not None:
                    cow.months_until_next_pregnancy -= 1
                    
                    if cow.months_until_next_pregnancy <= 0:
                        # Yeni gebelik başlangıcı
                        cow.is_pregnant = True
                        cow.months_until_birth = 9
                        cow.months_until_next_pregnancy = None
                        # Sadece daha önce doğum yapmış inekler sağmal olabilir
                        cow.is_milking = cow.has_given_birth
                
                # Gebe olmayan inekler sadece doğum yapmışsa sağmal olabilir
                cow.is_milking = cow.has_given_birth

        self.calves.extend(new_calves)

        # Buzağıların yaşını artır ve olgunlaşanları işle
        mature_female_calves = []
        remaining_calves = []

        for calf in self.calves:
            calf.age_months += 1
            
            if calf.age_months >= self.calf_maturity_age and calf.is_female:
                mature_female_calves.append(calf)
            else:
                remaining_calves.append(calf)

        # Olgunlaşan dişi buzağıları düve olarak ekle (gebe ama sağmal değil)
        for _ in mature_female_calves:
            self.cows.append(Cow(
                is_pregnant=True,
                months_until_birth=9,
                is_milking=False,  # Düveler sağmal değil
                has_given_birth=False  # Henüz doğum yapmadı
            ))

        # Erkek buzağıları kontrol et ve çıkar
        removed_males = sum(1 for calf in self.calves 
                          if calf.age_months >= self.male_calf_removal_age and not calf.is_female)
        self.total_removed_male_calves += removed_males

        # Kalan buzağıları güncelle
        self.calves = [calf for calf in remaining_calves 
                      if not (
                          (calf.age_months >= self.calf_maturity_age and calf.is_female) or
                          (calf.age_months >= self.male_calf_removal_age and not calf.is_female)
                      )]

        # Yeni inekleri ekle
        self.add_monthly_cow()
        self.current_date += relativedelta(months=1)

    def calculate_income(self, milking_cows):
        # Aylık süt geliri hesaplama
        daily_milk = milking_cows * self.milk_per_cow  # Günlük toplam süt üretimi
        monthly_milk = daily_milk * 30  # Aylık toplam süt üretimi
        milk_income = monthly_milk * self.milk_price  # Aylık süt geliri
        
        # Satılan erkek buzağılardan gelir
        male_calf_income = self.male_calf_price * (
            sum(1 for calf in self.calves 
                if not calf.is_female and calf.age_months >= self.male_calf_removal_age)
        )
        
        return milk_income + male_calf_income

    def calculate_expenses(self):
        # Tüm inekler için yem gideri
        total_cows = len(self.cows)
        daily_feed_cost = total_cows * self.feed_cost_per_cow
        monthly_feed_cost = daily_feed_cost * 30
        
        # Buzağılar için yem gideri (kullanıcının belirlediği oran kadar)
        total_calves = len(self.calves)
        daily_calf_feed_cost = total_calves * (self.feed_cost_per_cow * self.calf_feed_ratio)
        monthly_calf_feed_cost = daily_calf_feed_cost * 30
        
        # Toplam giderler
        total_expenses = monthly_feed_cost + monthly_calf_feed_cost + self.other_expenses
        
        return total_expenses

    def get_statistics(self):
        milking_cows = sum(1 for cow in self.cows if cow.is_milking)
        dry_cows = sum(1 for cow in self.cows if not cow.is_milking and cow.has_given_birth)
        
        # Gebe düve ve inek sayıları ayrı ayrı hesaplanıyor
        pregnant_heifers = sum(1 for cow in self.cows if cow.is_pregnant and not cow.has_given_birth)
        pregnant_cows = sum(1 for cow in self.cows if cow.is_pregnant and cow.has_given_birth)
        
        female_calves = sum(1 for calf in self.calves if calf.is_female)
        male_calves = sum(1 for calf in self.calves if not calf.is_female)
        
        total_animals = len(self.cows) + len(self.calves)  # Toplam hayvan sayısı
        
        # Gelir ve gider hesaplamaları
        income = self.calculate_income(milking_cows)
        expenses = self.calculate_expenses()
        profit = income - expenses
        
        return {
            'date': self.current_date.strftime('%Y-%m'),
            'milking_cows': milking_cows,
            'dry_cows': dry_cows,
            'pregnant_heifers': pregnant_heifers,
            'pregnant_cows': pregnant_cows,
            'female_calves': female_calves,
            'male_calves': male_calves,
            'total_animals': total_animals,
            'total_removed_male_calves': self.total_removed_male_calves,
            'income': round(income),  # Yuvarlanmış değerler
            'expenses': round(expenses),
            'profit': round(profit)
        }

def main():
    # Get parameters from command line argument
    params = json.loads(sys.argv[1])
    
    # Initialize herd manager with parameters
    herd = HerdManager(
        initial_cow_count=params['initial_cow_count'],
        initial_pregnancy_month=params['initial_pregnancy_month'],
        monthly_new_cows=params['monthly_new_cows'],
        new_cow_pregnancy_month=params['new_cow_pregnancy_month'],
        milking_threshold=params['milking_threshold'],
        calf_maturity_age=params['calf_maturity_age'],
        male_calf_removal_age=params['male_calf_removal_age'],
        birth_success_rate=params['birth_success_rate'],
        use_female_sperm=params['use_female_sperm'],
        start_year=params['start_year'],
        start_month=params['start_month'],
        post_birth_wait=params['post_birth_wait'],
        milk_per_cow=params['milk_per_cow'],
        milk_price=params['milk_price'],
        feed_cost_per_cow=params['feed_cost_per_cow'],
        other_expenses=params['other_expenses'],
        male_calf_price=params['male_calf_price'],
        calf_feed_ratio=params['calf_feed_ratio']
    )
    
    # Calculate results for specified number of months
    results = []
    for _ in range(params['months']):
        results.append(herd.get_statistics())
        herd.process_month()
    
    # Print results as JSON
    print(json.dumps(results))

if __name__ == "__main__":
    main() 