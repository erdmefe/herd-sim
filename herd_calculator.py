from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List
import json
import sys
import random
from dateutil.relativedelta import relativedelta
import pickle
import base64

@dataclass
class Cow:
    is_pregnant: bool
    months_until_birth: int = None
    months_until_next_pregnancy: int = None
    is_milking: bool = False
    has_given_birth: bool = False  # Hiç doğum yapıp yapmadığını takip etmek için
    age_months: int = 0  # İneğin yaşını takip etmek için
    is_dead: bool = False  # İneğin ölü olup olmadığını takip etmek için

@dataclass
class Calf:
    is_female: bool
    age_months: int = 0
    birth_date: datetime = None
    is_dead: bool = False  # Buzağının ölü olup olmadığını takip etmek için

class HerdManager:
    def __init__(self, initial_cow_count=10, initial_pregnancy_month=6, 
                 monthly_new_cows=1, new_cow_pregnancy_month=6, 
                 milking_threshold=2, calf_maturity_age=14,
                 male_calf_removal_age=6, birth_success_rate=95,
                 use_female_sperm=False, start_year=2026, start_month=9,
                 post_birth_wait=2, milk_per_cow=25, milk_price=21,
                 feed_cost_per_cow=150, other_expenses=25000,
                 male_calf_price=15000, calf_feed_ratio=0.2,
                 auto_add_cows=False, female_cow_threshold=2,
                 max_auto_add_cows=3, cow_source_type='external',
                 new_cow_price=75000, herd_size_limit=None, old_cow_price=50000,
                 enable_deaths=False, monthly_cow_death_rate=0.5, monthly_calf_death_rate=0.5,
                 enable_cow_addition=True, cow_addition_frequency=1,
                 staff_salary=15000, staff_per_animal=30):
        self.cows: List[Cow] = []
        self.calves: List[Calf] = []
        self.current_date = datetime(start_year, start_month, 1)
        self.total_removed_male_calves = 0
        self.total_removed_old_cows = 0  # Satılan yaşlı inek sayısını takip etmek için
        self.total_dead_cows = 0  # Toplam ölen inek sayısı
        self.total_dead_calves = 0  # Toplam ölen buzağı sayısı
        self.monthly_dead_cows = 0  # Bu ay ölen inek sayısı
        self.monthly_dead_calves = 0  # Bu ay ölen buzağı sayısı
        
        # Configuration parameters
        self.monthly_new_cows = monthly_new_cows
        self.new_cow_pregnancy_month = new_cow_pregnancy_month
        self.milking_threshold = milking_threshold
        self.calf_maturity_age = calf_maturity_age
        self.male_calf_removal_age = male_calf_removal_age
        self.birth_success_rate = birth_success_rate
        self.use_female_sperm = use_female_sperm
        self.post_birth_wait = post_birth_wait
        
        # İnek ekleme parametreleri
        self.enable_cow_addition = enable_cow_addition
        self.cow_addition_frequency = cow_addition_frequency
        self.months_since_last_addition = 0
        
        # Otomatik inek ekleme parametreleri
        self.auto_add_cows = auto_add_cows
        self.female_cow_threshold = female_cow_threshold
        self.max_auto_add_cows = max_auto_add_cows
        
        # Gelir/gider parametreleri
        self.milk_per_cow = milk_per_cow  # Günlük süt üretimi (lt)
        self.milk_price = milk_price  # Süt litre fiyatı (TL)
        self.feed_cost_per_cow = feed_cost_per_cow  # Günlük yem maliyeti (TL)
        self.other_expenses = other_expenses  # Aylık diğer giderler (TL)
        self.male_calf_price = male_calf_price
        self.calf_feed_ratio = calf_feed_ratio  # Buzağı yem oranı (0-1 arası)
        
        # Yeni inek parametreleri
        self.cow_source_type = cow_source_type  # 'external' veya 'internal'
        self.new_cow_price = new_cow_price  # Yeni inek fiyatı (TL)
        self.monthly_cow_expenses = 0  # Her ay eklenen ineklerin toplam maliyeti
        
        # Sürü limiti parametreleri
        self.herd_size_limit = herd_size_limit  # Maksimum sürü büyüklüğü
        self.old_cow_price = old_cow_price  # Yaşlı inek satış fiyatı
        
        # Ölüm parametreleri
        self.enable_deaths = enable_deaths  # Ölüm özelliği açık/kapalı
        self.monthly_cow_death_rate = monthly_cow_death_rate  # Aylık inek ölüm oranı (%)
        self.monthly_calf_death_rate = monthly_calf_death_rate  # Aylık buzağı ölüm oranı (%)
        
        # Personel giderleri
        self.staff_salary = staff_salary  # Aylık çalışan maaşı
        self.staff_per_animal = staff_per_animal  # Hayvan başına çalışan sayısı
        
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
                has_given_birth=True,
                age_months=0,
                is_dead=False
            ))

        self.monthly_stats = []  # Aylık istatistikleri saklamak için yeni liste
        self.addition_months = []  # İnek ekleme aylarını takip etmek için

    def add_monthly_cow(self):
        # Her ay başında yeni inek maliyetini sıfırla
        self.monthly_cow_expenses = 0
        
        # İnek ekleme devre dışı bırakıldıysa hiçbir şey yapma
        if not self.enable_cow_addition:
            return
            
        # Ekleme frekansını kontrol et
        self.months_since_last_addition += 1
        if self.months_since_last_addition < self.cow_addition_frequency:
            return
            
        # Ekleme zamanı geldi, sayacı sıfırla
        self.months_since_last_addition = 0
        
        # Manuel eklenen inekler
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
                has_given_birth=True,
                age_months=0,
                is_dead=False
            )
            self.cows.append(new_cow)
            
            # Öz kaynak seçiliyse maliyeti ekle
            if self.cow_source_type == 'internal':
                self.monthly_cow_expenses += self.new_cow_price

        # Otomatik inek ekleme kontrolü
        if self.auto_add_cows:
            # Dişi buzağıları yaşlarına göre sırala (büyükten küçüğe)
            female_calves = sorted(
                [calf for calf in self.calves if calf.is_female],
                key=lambda x: x.age_months,
                reverse=True
            )
            
            # Eklenebilecek inek sayısını hesapla
            auto_add_count = min(
                len(female_calves) // self.female_cow_threshold,  # Dişi buzağı sayısına göre eklenebilecek inek
                self.max_auto_add_cows  # Maksimum ekleme limiti
            )
            
            if auto_add_count > 0:
                # Kullanılacak buzağıları seç (en yaşlı olanlardan başla)
                calves_to_remove = female_calves[:auto_add_count * self.female_cow_threshold]
                
                # Seçilen buzağıları sürüden çıkar
                self.calves = [calf for calf in self.calves if calf not in calves_to_remove]
                
                # Her buzağı grubu için bir inek ekle
                for _ in range(auto_add_count):
                    if self.new_cow_pregnancy_month == 'random':
                        preg_month = random.randint(1, 9)
                    else:
                        preg_month = self.new_cow_pregnancy_month
                        
                    months_until_birth = 9 - preg_month + 1
                    new_cow = Cow(
                        is_pregnant=True,
                        months_until_birth=months_until_birth,
                        is_milking=months_until_birth > self.milking_threshold,
                        has_given_birth=True,
                        age_months=0,
                        is_dead=False
                    )
                    self.cows.append(new_cow)
                    
                    # Öz kaynak seçiliyse maliyeti ekle
                    if self.cow_source_type == 'internal':
                        self.monthly_cow_expenses += self.new_cow_price

    def remove_old_cows(self):
        """
        Sürü büyüklüğü limitini aştığında en yaşlı inekleri satarak limiti korur.
        Returns:
            int: Satılan inek sayısı
        """
        if not self.herd_size_limit:
            return 0

        # Sadece yaşayan hayvanları say
        total_living_animals = sum(1 for cow in self.cows if not cow.is_dead) + sum(1 for calf in self.calves if not calf.is_dead)
        if total_living_animals <= self.herd_size_limit:
            return 0

        # Kaç inek satılması gerektiğini hesapla
        excess_animals = total_living_animals - self.herd_size_limit
        
        # Yaşayan inekleri yaşlarına göre sırala (en yaşlıdan en gence)
        sorted_living_cows = sorted(
            [cow for cow in self.cows if not cow.is_dead],
            key=lambda x: x.age_months,
            reverse=True
        )
        
        # En yaşlı inekleri sat
        removed_count = min(excess_animals, len(sorted_living_cows))
        cows_to_keep = sorted_living_cows[removed_count:]
        
        # Yaşayan ve satılmayan inekleri koru, ölü inekleri de listede tut
        self.cows = [cow for cow in self.cows if cow.is_dead or cow in cows_to_keep]
        self.total_removed_old_cows += removed_count
        
        return removed_count

    def process_deaths(self):
        """
        Aylık ölüm işlemlerini gerçekleştirir
        """
        if not self.enable_deaths:
            self.monthly_dead_cows = 0
            self.monthly_dead_calves = 0
            return

        # İnek ölümlerini hesapla
        alive_cows = [cow for cow in self.cows if not cow.is_dead]
        dead_cows = []
        for cow in alive_cows:
            # Her inek için ölüm olasılığını kontrol et
            if random.random() < (self.monthly_cow_death_rate / 100):
                dead_cows.append(cow)
        
        # Buzağı ölümlerini hesapla
        alive_calves = [calf for calf in self.calves if not calf.is_dead]
        dead_calves = []
        for calf in alive_calves:
            # Her buzağı için ölüm olasılığını kontrol et
            if random.random() < (self.monthly_calf_death_rate / 100):
                dead_calves.append(calf)
        
        # Ölüm durumlarını işaretle
        for cow in dead_cows:
            cow.is_dead = True
        for calf in dead_calves:
            calf.is_dead = True
        
        # Aylık ve toplam ölüm sayılarını güncelle
        self.monthly_dead_cows = len(dead_cows)
        self.monthly_dead_calves = len(dead_calves)
        self.total_dead_cows += self.monthly_dead_cows
        self.total_dead_calves += self.monthly_dead_calves

    def process_month(self):
        # Her ineğin yaşını bir ay artır
        for cow in self.cows:
            if not cow.is_dead:
                cow.age_months += 1

        # Process existing cows
        new_calves = []
        
        for cow in self.cows:
            if cow.is_dead:
                continue

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
                            birth_date=self.current_date,
                            is_dead=False
                        ))
                        cow.has_given_birth = True  # İlk doğumunu yaptı
                        cow.is_milking = True  # Doğum sonrası sağmal olur
                    
                    # Doğum sonrası inek durumu güncelleme
                    cow.is_pregnant = False
                    cow.months_until_birth = None
                    cow.months_until_next_pregnancy = self.post_birth_wait
                
                elif cow.months_until_birth <= self.milking_threshold:
                    cow.is_milking = False  # Doğuma yakın dönemde sağmal değil
                else:
                    cow.is_milking = cow.has_given_birth
            
            else:  # Gebe olmayan inekler
                if cow.months_until_next_pregnancy is not None:
                    cow.months_until_next_pregnancy -= 1
                    
                    if cow.months_until_next_pregnancy <= 0:
                        cow.is_pregnant = True
                        cow.months_until_birth = 9
                        cow.months_until_next_pregnancy = None
                        cow.is_milking = cow.has_given_birth
                
                cow.is_milking = cow.has_given_birth

        self.calves.extend(new_calves)

        # Buzağıların yaşını artır
        for calf in self.calves:
            if not calf.is_dead:
                calf.age_months += 1

        # Olgunlaşan dişi buzağıları ve satılacak erkek buzağıları işle
        mature_female_calves = []
        remaining_calves = []

        for calf in self.calves:
            if calf.is_dead:
                remaining_calves.append(calf)
                continue

            if calf.age_months >= self.calf_maturity_age and calf.is_female:
                mature_female_calves.append(calf)
            else:
                remaining_calves.append(calf)

        # Olgunlaşan dişi buzağıları düve olarak ekle
        for _ in mature_female_calves:
            self.cows.append(Cow(
                is_pregnant=True,
                months_until_birth=9,
                is_milking=False,
                has_given_birth=False,
                age_months=0,
                is_dead=False
            ))

        # Erkek buzağıları kontrol et ve çıkar
        removed_males = sum(1 for calf in self.calves 
                          if not calf.is_dead and not calf.is_female and 
                          calf.age_months >= self.male_calf_removal_age)
        self.total_removed_male_calves += removed_males

        # Kalan buzağıları güncelle
        self.calves = [calf for calf in remaining_calves 
                      if not (
                          not calf.is_dead and
                          ((calf.age_months >= self.calf_maturity_age and calf.is_female) or
                           (calf.age_months >= self.male_calf_removal_age and not calf.is_female))
                      )]

        # Yeni inekleri ekle
        self.add_monthly_cow()

        # Yaşlı inekleri sat (eğer limit aşıldıysa)
        removed_old_cows = self.remove_old_cows()

        # Ölüm işlemlerini gerçekleştir
        self.process_deaths()

        self.current_date += relativedelta(months=1)

        # Her ay işlendiğinde istatistikleri sakla
        self.monthly_stats.append(self.get_statistics())

    def calculate_income(self, milking_cows, removed_male_calves=None, current_removed_old_cows=None):
        """
        Aylık gelir hesaplama
        Args:
            milking_cows (int): Sağmal inek sayısı
            removed_male_calves (int, optional): O ay satılan erkek buzağı sayısı
            current_removed_old_cows (int, optional): O ay satılan yaşlı inek sayısı
        Returns:
            float: Toplam aylık gelir
        """
        # 1. Süt geliri hesaplama (sadece yaşayan sağmal inekler)
        daily_milk = float(milking_cows) * float(self.milk_per_cow)
        monthly_milk = daily_milk * 30.0
        milk_income = monthly_milk * float(self.milk_price)
        
        # 2. Erkek buzağı satış geliri (sadece yaşayan erkek buzağılar)
        if removed_male_calves is not None:
            male_calf_income = float(removed_male_calves) * float(self.male_calf_price)
        else:
            removable_male_calves = sum(1 for calf in self.calves 
                if not calf.is_female and not calf.is_dead and calf.age_months >= self.male_calf_removal_age)
            male_calf_income = float(removable_male_calves) * float(self.male_calf_price)
        
        # 3. Yaşlı inek satış geliri (sadece yaşayan inekler)
        if current_removed_old_cows is not None:
            old_cow_income = float(current_removed_old_cows) * float(self.old_cow_price)
        else:
            # Eğer current_removed_old_cows verilmemişse, son ayın verilerini kullan
            if not self.monthly_stats:  # İlk ay
                previous_removed_old_cows = 0
            else:
                previous_removed_old_cows = self.monthly_stats[-1]['total_removed_old_cows']
            current_removed_old_cows = self.total_removed_old_cows - previous_removed_old_cows
            old_cow_income = float(current_removed_old_cows) * float(self.old_cow_price)
        
        # Toplam gelir = Süt geliri + Erkek buzağı satış geliri + Yaşlı inek satış geliri
        total_income = milk_income + male_calf_income + old_cow_income
        
        return total_income

    def calculate_expenses(self, total_cows=None, total_calves=None, is_addition_month=False, auto_added_cows=0):
        """
        Aylık gider hesaplama
        Args:
            total_cows (int, optional): Toplam inek sayısı (finansal güncelleme için)
            total_calves (int, optional): Toplam buzağı sayısı (finansal güncelleme için)
            is_addition_month (bool): Bu ayın inek ekleme ayı olup olmadığı
            auto_added_cows (int): Bu ay otomatik olarak eklenen inek sayısı
        Returns:
            float: Toplam aylık gider
        """
        # 1. İnek yem giderleri
        if total_cows is None:
            total_cows = sum(1 for cow in self.cows if not cow.is_dead)
        daily_feed_cost = float(total_cows) * float(self.feed_cost_per_cow)
        monthly_feed_cost = daily_feed_cost * 30.0
        
        # 2. Buzağı yem giderleri
        if total_calves is None:
            total_calves = sum(1 for calf in self.calves if not calf.is_dead)
        daily_calf_feed_cost = float(total_calves) * (float(self.feed_cost_per_cow) * float(self.calf_feed_ratio))
        monthly_calf_feed_cost = daily_calf_feed_cost * 30.0
        
        # 3. Yeni inek maliyetleri (öz kaynak seçiliyse)
        new_cow_cost = 0.0
        if self.cow_source_type == 'internal' and is_addition_month:
            # Manuel eklenen inekler
            new_cow_cost += float(self.monthly_new_cows) * float(self.new_cow_price)
            # Otomatik eklenen inekler
            if self.auto_add_cows:
                new_cow_cost += float(auto_added_cows) * float(self.new_cow_price)
        
        # 4. Personel giderleri
        if total_cows is None:
            total_cows = sum(1 for cow in self.cows if not cow.is_dead)
        if total_calves is None:
            total_calves = sum(1 for calf in self.calves if not calf.is_dead)
        total_animals = total_cows + total_calves
        
        # Tamamlanan her "staff_per_animal" sayısı için bir çalışan eklenir.
        staff_count = total_animals // self.staff_per_animal
        
        staff_expense = staff_count * self.staff_salary
        
        # 5. Diğer giderler (sabit giderler)
        other_expenses = float(self.other_expenses)
        
        # Toplam gider = İnek yem gideri + Buzağı yem gideri + Yeni inek maliyeti + Personel gideri + Diğer giderler
        total_expenses = monthly_feed_cost + monthly_calf_feed_cost + new_cow_cost + staff_expense + other_expenses
        
        return total_expenses
    
    def get_statistics(self):
        # Sadece yaşayan inekleri say
        milking_cows = sum(1 for cow in self.cows if cow.is_milking and not cow.is_dead)
        dry_cows = sum(1 for cow in self.cows if not cow.is_milking and cow.has_given_birth and not cow.is_dead)
        
        # Gebe düve ve inek sayıları ayrı ayrı hesaplanıyor (sadece yaşayanlar)
        pregnant_heifers = sum(1 for cow in self.cows if cow.is_pregnant and not cow.has_given_birth and not cow.is_dead)
        pregnant_cows = sum(1 for cow in self.cows if cow.is_pregnant and cow.has_given_birth and not cow.is_dead)
        
        # Sadece yaşayan buzağıları say
        female_calves = sum(1 for calf in self.calves if calf.is_female and not calf.is_dead)
        male_calves = sum(1 for calf in self.calves if not calf.is_female and not calf.is_dead)
        
        # Toplam hayvan sayısı (sadece yaşayanlar)
        total_animals = sum(1 for cow in self.cows if not cow.is_dead) + sum(1 for calf in self.calves if not calf.is_dead)
        
        # Sağmal oranı hesaplama (yüzde olarak)
        milking_ratio = round((milking_cows / total_animals * 100) if total_animals > 0 else 0, 1)
        
        # Bu ay satılan erkek buzağı ve yaşlı inek sayısını hesapla
        if not self.monthly_stats:  # İlk ay
            previous_removed_males = 0
            previous_removed_old_cows = 0
        else:
            previous_removed_males = self.monthly_stats[-1]['total_removed_male_calves']
            previous_removed_old_cows = self.monthly_stats[-1]['total_removed_old_cows']
        
        current_removed_males = self.total_removed_male_calves - previous_removed_males
        current_removed_old_cows = self.total_removed_old_cows - previous_removed_old_cows
        
        # Gider hesaplaması için gerekli olan "ekleme ayı" ve "otomatik eklenen" bilgilerini hesapla
        is_addition_month = self.enable_cow_addition and self.cow_source_type == 'internal' and self.months_since_last_addition == 0
        
        auto_added_cows = 0
        if self.auto_add_cows and is_addition_month:
            female_calves_count = sum(1 for calf in self.calves if calf.is_female and not calf.is_dead)
            auto_added_cows = min(
                female_calves_count // self.female_cow_threshold,
                self.max_auto_add_cows
            )

        # Gelir ve gider hesaplamaları
        income = self.calculate_income(milking_cows, current_removed_males, current_removed_old_cows)
        expenses = self.calculate_expenses(
            is_addition_month=is_addition_month,
            auto_added_cows=auto_added_cows
        )
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
            'total_removed_old_cows': self.total_removed_old_cows,
            'current_removed_old_cows': current_removed_old_cows,
            'milking_ratio': milking_ratio,
            'income': round(income),
            'expenses': round(expenses),
            'profit': round(profit),
            'auto_added_cows': auto_added_cows,
            'old_cow_price': self.old_cow_price,
            'total_dead_cows': self.total_dead_cows,
            'total_dead_calves': self.total_dead_calves,
            'monthly_dead_cows': self.monthly_dead_cows,
            'monthly_dead_calves': self.monthly_dead_calves,
            'is_addition_month': is_addition_month
        }

    def update_financials(self, milk_per_cow, milk_price, male_calf_price, feed_cost_per_cow, 
                         calf_feed_ratio, other_expenses, cow_source_type='external', new_cow_price=75000,
                         herd_size_limit=None, old_cow_price=50000, enable_deaths=False,
                         monthly_cow_death_rate=0.5, monthly_calf_death_rate=0.5,
                         enable_cow_addition=True, cow_addition_frequency=1,
                         staff_salary=15000, staff_per_animal=30):
        """
        Finansal parametreleri güncelle ve tüm ayların hesaplamalarını yeniden yap
        """
        # 1. Finansal parametreleri güncelle
        self.milk_per_cow = float(milk_per_cow)
        self.milk_price = float(milk_price)
        self.male_calf_price = float(male_calf_price)
        self.feed_cost_per_cow = float(feed_cost_per_cow)
        self.calf_feed_ratio = float(calf_feed_ratio)
        self.other_expenses = float(other_expenses)
        self.cow_source_type = cow_source_type
        self.new_cow_price = float(new_cow_price)
        self.herd_size_limit = herd_size_limit
        self.old_cow_price = float(old_cow_price)
        self.enable_deaths = enable_deaths
        self.monthly_cow_death_rate = float(monthly_cow_death_rate)
        self.monthly_calf_death_rate = float(monthly_calf_death_rate)
        self.enable_cow_addition = enable_cow_addition
        self.cow_addition_frequency = int(cow_addition_frequency) # Gelen yeni değeri al
        self.staff_salary = float(staff_salary)
        self.staff_per_animal = int(staff_per_animal)

        # 2. Tüm ayların finansal verilerini yeniden hesapla
        updated_stats = []
        previous_removed_males = 0
        previous_removed_old_cows = 0
    
        # Döngü içinde yeni frekansa göre ekleme aylarını belirle
        for index, month_stat in enumerate(self.monthly_stats):
            # Bu ay satılan hayvan sayılarını hesapla
            current_removed_males = month_stat['total_removed_male_calves'] - previous_removed_males
            current_removed_old_cows = month_stat['total_removed_old_cows'] - previous_removed_old_cows
            
            previous_removed_males = month_stat['total_removed_male_calves']
            previous_removed_old_cows = month_stat['total_removed_old_cows']
            
            # Geliri yeniden hesapla
            milking_cows = month_stat['milking_cows']
            income = self.calculate_income(milking_cows, current_removed_males, current_removed_old_cows)
            
            # Gideri yeniden hesaplamak için gerekli bilgileri al
            total_cows = month_stat['milking_cows'] + month_stat['dry_cows'] + month_stat['pregnant_heifers']
            total_calves = month_stat['female_calves'] + month_stat['male_calves']
            auto_added_cows = month_stat.get('auto_added_cows', 0)
            
            # YENİ frekansa göre bu ayın ekleme ayı olup olmadığını belirle
            is_addition_month_for_update = False
            if self.enable_cow_addition and self.cow_source_type == 'internal':
                # index % frekans == 0 kontrolü, her 'frekans' ayda bir True olur (0. ay, N. ay, 2N. ay vb.)
                 if (index + 1) % self.cow_addition_frequency == 0:
                    is_addition_month_for_update = True
            
            # Gideri, YENİ belirlenen ekleme ayı bilgisiyle yeniden hesapla
            expenses = self.calculate_expenses(
                total_cows=total_cows,
                total_calves=total_calves,
                is_addition_month=is_addition_month_for_update,
                auto_added_cows=auto_added_cows
            )
            
            profit = income - expenses

            # Ayın istatistiklerini güncelle
            updated_month = month_stat.copy()
            updated_month.update({
                'income': round(income),
                'expenses': round(expenses),
                'profit': round(profit)
            })
            updated_stats.append(updated_month)
        # --- DÜZELTME SONU ---
        return updated_stats

def main():
    # Get parameters from command line argument
    params = json.loads(sys.argv[1])
    
    if len(sys.argv) > 2 and sys.argv[2] == "update_financials":
        # Update financial parameters only
        herd_state_base64 = params['herd_state']
        herd_state_binary = base64.b64decode(herd_state_base64)  # base64'ten binary'ye çevir
        herd = pickle.loads(herd_state_binary)  # binary'den nesneye çevir
        results = herd.update_financials(
            milk_per_cow=params.get('milk_per_cow', 25),
            milk_price=params.get('milk_price', 21),
            male_calf_price=params.get('male_calf_price', 15000),
            feed_cost_per_cow=params.get('feed_cost_per_cow', 150),
            calf_feed_ratio=params.get('calf_feed_ratio', 0.2),
            other_expenses=params.get('other_expenses', 25000),
            cow_source_type=params.get('cow_source_type', 'external'),
            new_cow_price=params.get('new_cow_price', 75000),
            herd_size_limit=params.get('herd_size_limit'),
            old_cow_price=params.get('old_cow_price', 50000),
            enable_deaths=params.get('enable_deaths', False),
            monthly_cow_death_rate=params.get('monthly_cow_death_rate', 0.5),
            monthly_calf_death_rate=params.get('monthly_calf_death_rate', 0.5),
            # Bu iki parametrenin doğru alındığından emin oluyoruz
            enable_cow_addition=params.get('enable_cow_addition', True),
            cow_addition_frequency=params.get('cow_addition_frequency', 1),
            staff_salary=params.get('staff_salary', 15000),
            staff_per_animal=params.get('staff_per_animal', 30)
        )
        print(json.dumps(results))
        sys.exit(0)

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
        calf_feed_ratio=params['calf_feed_ratio'],
        auto_add_cows=params.get('auto_add_cows', False),
        female_cow_threshold=params.get('female_cow_threshold', 2),
        max_auto_add_cows=params.get('max_auto_add_cows', 3),
        cow_source_type=params.get('cow_source_type', 'external'),
        new_cow_price=params.get('new_cow_price', 75000),
        herd_size_limit=params.get('herd_size_limit'),
        old_cow_price=params.get('old_cow_price', 50000),
        enable_deaths=params.get('enable_deaths', False),
        monthly_cow_death_rate=params.get('monthly_cow_death_rate', 0.5),
            monthly_calf_death_rate=params.get('monthly_calf_death_rate', 0.5),
            enable_cow_addition=params.get('enable_cow_addition', True),
            cow_addition_frequency=params.get('cow_addition_frequency', 1),
            staff_salary=params.get('staff_salary', 15000),
            staff_per_animal=params.get('staff_per_animal', 30)
    )
    
    # Calculate results for specified number of months
    for _ in range(params['months']):
        herd.process_month()
    
    # Son sürü durumunu kaydet ve sonuçlara ekle
    herd_state = {
        'herd_state': base64.b64encode(pickle.dumps(herd)).decode('utf-8')
    }
    results = herd.monthly_stats.copy()
    results.append(herd_state)
    
    # Print results as JSON
    print(json.dumps(results))

if __name__ == '__main__':
    main()
